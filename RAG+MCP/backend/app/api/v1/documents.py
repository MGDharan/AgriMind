import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.rag_pipeline import ingest_document
from app.core.vector_store import delete_document_chunks
from app.database import AsyncSessionFactory, get_db
from app.models.document import Document, DocumentStatus
from app.models.schemas import DocumentListResponse, DocumentResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path("/tmp/rag_uploads")
ALLOWED_EXT = {".pdf", ".docx", ".doc", ".txt", ".md", ".markdown", ".csv"}


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(400, "No filename")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            400,
            f"Unsupported type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}",
        )

    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(413, "File exceeds 50 MB limit")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    doc_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{doc_id}{ext}"
    file_path.write_bytes(content)

    document = Document(
        id=doc_id,
        name=f"{doc_id}{ext}",
        original_name=file.filename,
        file_type=ext,
        size=len(content),
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    background_tasks.add_task(
        _ingest_bg,
        file_path=file_path,
        doc_id=doc_id,
        doc_name=file.filename,
        file_type=ext,
    )

    return document


async def _ingest_bg(file_path: Path, doc_id: str, doc_name: str, file_type: str):
    async with AsyncSessionFactory() as db:
        try:
            await ingest_document(file_path, doc_id, doc_name, file_type, db)
        except Exception as exc:
            logger.error("Background ingest failed", doc_id=doc_id, error=str(exc))
        finally:
            if file_path.exists():
                file_path.unlink()


@router.get("/", response_model=DocumentListResponse)
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return DocumentListResponse(documents=list(docs), total=len(docs))


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    await delete_document_chunks(doc_id)
    await db.delete(doc)
    await db.commit()
    return {"message": f"Document '{doc.original_name}' deleted successfully"}
