"""
Knowledge Base API — Qdrant RAG + document management.

POST /api/knowledge/chat          — streaming SSE chat with RAG
POST /api/knowledge/documents     — upload a document for ingestion
GET  /api/knowledge/documents     — list ingested documents
DELETE /api/knowledge/documents/{id} — delete a document
"""

import json
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.rag_engine import (
    build_farm_context,
    chunk_text,
    delete_doc,
    ingest_text,
    query_and_stream,
)
from app.models.entities import Farm, Prediction, User
from app.repositories.base import FarmRepository, PredictionRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

# ── Simple in-process document registry (SQLite-backed) ──────────────────────
# We store docs in the Prediction table with agent="rag_doc" to avoid a new
# migration. The result_json stores {"doc_id", "name", "chunks"}.

UPLOAD_DIR = Path("uploads/knowledge")
ALLOWED_EXT = {".pdf", ".txt", ".md", ".docx", ".csv"}

# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class DocMeta(BaseModel):
    id: str
    name: str
    chunks: int
    created_at: str


# ── Extract text from uploaded file ──────────────────────────────────────────

def _extract_text(filepath: Path, ext: str) -> str:
    """Extract plain text from supported file types."""
    if ext in (".txt", ".md", ".markdown"):
        return filepath.read_text(encoding="utf-8", errors="replace")

    if ext == ".pdf":
        try:
            import pdfplumber  # type: ignore
            with pdfplumber.open(str(filepath)) as pdf:
                return "\n\n".join(p.extract_text() or "" for p in pdf.pages)
        except ImportError:
            logger.warning("pdfplumber not installed — treating PDF as binary (no text)")
            return ""

    if ext in (".docx", ".doc"):
        try:
            from docx import Document as DocxDoc  # type: ignore
            doc = DocxDoc(str(filepath))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            logger.warning("python-docx not installed — skipping DOCX")
            return ""

    if ext == ".csv":
        try:
            import pandas as pd  # type: ignore
            df = pd.read_csv(str(filepath))
            return df.to_string(index=False)
        except ImportError:
            return filepath.read_text(encoding="utf-8", errors="replace")

    return filepath.read_text(encoding="utf-8", errors="replace")


# ── Background ingestion ──────────────────────────────────────────────────────

async def _ingest_bg(
    filepath: Path,
    doc_id: str,
    doc_name: str,
    ext: str,
    user_id: int,
    db_url: str,
) -> None:
    """Extract, chunk, embed, and store. Called as a background task."""
    try:
        text = _extract_text(filepath, ext)
        if not text.strip():
            logger.warning("No text extracted from %s", doc_name)
            return
        n = await ingest_text(doc_id, doc_name, text, user_id=user_id, stable_ids=True)
        logger.info("Ingested %d chunks for doc=%s user=%d", n, doc_name, user_id)
    except Exception as exc:
        logger.error("Ingest failed for %s: %s", doc_name, exc)
    finally:
        if filepath.exists():
            filepath.unlink()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_farm_context(user: User, db: Session) -> str:
    """Build farm context string for the current user."""
    farm_repo = FarmRepository(db)
    farms = farm_repo.list_by_owner(user.id)

    pred_repo = PredictionRepository(db)
    recent_preds = pred_repo.list_by_user(user.id, limit=10)

    farms_data = []
    for f in farms:
        fields_data = [
            {"crop": fl.crop, "crop_age_days": fl.crop_age_days}
            for fl in (f.fields or [])
        ]
        farms_data.append({
            "name": f.name,
            "location": f.location,
            "area_acres": f.area_acres,
            "fields": fields_data,
        })

    scans = []
    for p in recent_preds:
        if p.agent in ("coordinator_image", "coordinator"):
            try:
                data = json.loads(p.result_json)
                summary = data.get("summary", p.input_summary)
            except Exception:
                summary = p.input_summary
            scans.append({
                "date": p.created_at.strftime("%Y-%m-%d"),
                "summary": summary,
            })

    return build_farm_context({
        "location": user.location or "India",
        "farms": farms_data,
        "recent_scans": scans,
    })


async def _ingest_user_history(user: User, db: Session) -> None:
    """Embed recent user prediction history and store it in Qdrant."""
    pred_repo = PredictionRepository(db)
    predictions = pred_repo.list_by_user(user.id, limit=20)
    history_lines: list[str] = []

    for p in predictions:
        try:
            data = json.loads(p.result_json)
            result_summary = data.get("summary") or data.get("recommendation") or json.dumps(data)
        except Exception:
            result_summary = p.result_json or ""
        if result_summary:
            history_lines.append(
                f"{p.created_at.strftime('%Y-%m-%d')} [{p.agent}] {p.input_summary}: {result_summary}"
            )
        else:
            history_lines.append(
                f"{p.created_at.strftime('%Y-%m-%d')} [{p.agent}] {p.input_summary}"
            )

    if not history_lines:
        return

    text = "\n\n".join(history_lines)
    await ingest_text(
        doc_id=f"user_history_{user.id}",
        doc_name="User history",
        text=text,
        user_id=user.id,
        stable_ids=True,
    )


def _list_docs(user: User, db: Session) -> list[dict]:
    """List uploaded knowledge documents for this user."""
    preds = (
        db.query(Prediction)
        .filter(Prediction.user_id == user.id, Prediction.agent == "rag_doc")
        .order_by(Prediction.created_at.desc())
        .all()
    )
    docs = []
    for p in preds:
        try:
            meta = json.loads(p.result_json)
            docs.append({
                "id": meta.get("doc_id", str(p.id)),
                "name": meta.get("name", p.input_summary),
                "chunks": meta.get("chunks", 0),
                "created_at": p.created_at.isoformat(),
            })
        except Exception:
            pass
    return docs


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Streaming SSE endpoint.
    Retrieves relevant chunks from Qdrant, injects farm context,
    then streams Ollama LLM response token by token.
    """
    farm_context = _get_user_farm_context(user, db)
    await _ingest_user_history(user, db)

    async def generate():
        try:
            async for event in query_and_stream(
                request.question,
                farm_context=farm_context,
                user_id=user.id,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.error("Chat stream error: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/documents", status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF, TXT, MD, DOCX or CSV for RAG ingestion."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 50MB limit")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    doc_id = str(uuid.uuid4())
    filepath = UPLOAD_DIR / f"{doc_id}{ext}"
    filepath.write_bytes(content)

    # Save metadata in Prediction table (reuse agent="rag_doc")
    meta = {"doc_id": doc_id, "name": file.filename, "chunks": 0}
    pred = Prediction(
        user_id=user.id,
        agent="rag_doc",
        input_summary=file.filename,
        result_json=json.dumps(meta),
        confidence=None,
    )
    db.add(pred)
    db.commit()

    # Ingest in background
    background_tasks.add_task(
        _ingest_bg,
        filepath=filepath,
        doc_id=doc_id,
        doc_name=file.filename,
        ext=ext,
        user_id=user.id,
        db_url="",  # unused, kept for signature clarity
    )

    return {"doc_id": doc_id, "name": file.filename, "status": "processing"}


@router.get("/documents")
def list_documents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _list_docs(user, db)


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find the record
    pred = (
        db.query(Prediction)
        .filter(Prediction.user_id == user.id, Prediction.agent == "rag_doc")
        .all()
    )
    record = None
    for p in pred:
        try:
            meta = json.loads(p.result_json)
            if meta.get("doc_id") == doc_id:
                record = p
                break
        except Exception:
            pass

    if not record:
        raise HTTPException(404, "Document not found")

    await delete_doc(doc_id)
    db.delete(record)
    db.commit()
    return {"message": "Document deleted"}
