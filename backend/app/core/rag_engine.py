"""
RAG Engine for AgriMind — adapted from the RAG+MCP project.

Uses:
  - Qdrant      : vector store (cosine similarity, nomic-embed-text 768-dim)
  - Ollama      : embeddings (nomic-embed-text) + chat (llama3.2 / qwen2.5)
  - Chunker     : recursive character splitter (512 chars / 64 overlap)

Gracefully degrades to the keyword-based fallback when Qdrant / Ollama
are unavailable (e.g., in local dev without Docker).
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from pathlib import Path
from typing import AsyncGenerator, List, Optional

logger = logging.getLogger(__name__)

# ── Settings ──────────────────────────────────────────────────────────────────

from app.core.config import get_settings

_s = get_settings()

QDRANT_HOST = getattr(_s, "qdrant_host", "localhost")
QDRANT_PORT = getattr(_s, "qdrant_port", 6333)
QDRANT_COLLECTION = getattr(_s, "qdrant_collection", "agrimind_knowledge")
OLLAMA_URL = _s.ollama_url
EMBED_MODEL = getattr(_s, "ollama_embed_model", "nomic-embed-text")
CHAT_MODEL = getattr(_s, "ollama_model", "llama3.2")
CHUNK_SIZE = getattr(_s, "chunk_size", 512)
CHUNK_OVERLAP = getattr(_s, "chunk_overlap", 64)
TOP_K = getattr(_s, "rag_top_k", 5)
EMBED_DIM = getattr(_s, "embedding_dim", 768)

# ── Chunker (copied from RAG+MCP) ─────────────────────────────────────────────

_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]


def _split_recursive(text: str, separators: list[str], size: int, overlap: int) -> list[str]:
    sep = ""
    new_seps: list[str] = []
    for i, s in enumerate(separators):
        if s == "":
            sep = s
            break
        if s in text:
            sep = s
            new_seps = separators[i + 1:]
            break

    splits = text.split(sep) if sep else list(text)
    good: list[str] = []
    cur_len = 0
    chunks: list[str] = []

    for s in splits:
        s_len = len(s)
        add_len = s_len + (len(sep) if good else 0)
        if cur_len + add_len > size and good:
            merged = sep.join(good)
            if merged.strip():
                chunks.append(merged)
            while good and cur_len > overlap:
                removed = good.pop(0)
                cur_len -= len(removed) + len(sep)
            cur_len = max(0, cur_len)
        if s_len > size and new_seps:
            chunks.extend(_split_recursive(s, new_seps, size, overlap))
        else:
            good.append(s)
            cur_len += s_len + len(sep)

    if good:
        merged = sep.join(good)
        if merged.strip():
            chunks.append(merged)
    return chunks


def chunk_text(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= CHUNK_SIZE:
        return [text]
    return [c.strip() for c in _split_recursive(text, _SEPARATORS, CHUNK_SIZE, CHUNK_OVERLAP) if c.strip()]


# ── Qdrant client ─────────────────────────────────────────────────────────────

_qdrant: Optional[object] = None
_qdrant_ok: Optional[bool] = None


async def _get_qdrant():
    global _qdrant, _qdrant_ok
    if _qdrant_ok is False:
        return None
    if _qdrant is not None:
        return _qdrant
    try:
        from qdrant_client import AsyncQdrantClient  # type: ignore
        from qdrant_client.models import Distance, VectorParams  # type: ignore
        client = AsyncQdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        collections = await client.get_collections()
        existing = {c.name for c in collections.collections}
        if QDRANT_COLLECTION not in existing:
            await client.create_collection(
                collection_name=QDRANT_COLLECTION,
                vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
            )
            logger.info("Created Qdrant collection: %s", QDRANT_COLLECTION)
        _qdrant = client
        _qdrant_ok = True
        return client
    except Exception as exc:
        logger.warning("Qdrant unavailable (%s) — RAG will use keyword fallback", exc)
        _qdrant_ok = False
        return None


# ── Ollama embeddings ─────────────────────────────────────────────────────────

async def _embed(text: str) -> Optional[list[float]]:
    try:
        from ollama import Client  # type: ignore
        loop = asyncio.get_event_loop()
        client = Client(host=OLLAMA_URL)
        resp = await loop.run_in_executor(
            None,
            lambda: client.embeddings(model=EMBED_MODEL, prompt=text),
        )
        return resp["embedding"]
    except Exception as exc:
        logger.warning("Embedding failed: %s", exc)
        return None


async def _embed_batch(texts: list[str]) -> list[Optional[list[float]]]:
    return await asyncio.gather(*[_embed(t) for t in texts])


# ── Ingest a document into Qdrant ─────────────────────────────────────────────

import uuid as _uuid


async def ingest_text(doc_id: str, doc_name: str, text: str) -> int:
    """
    Chunk + embed + store a text document in Qdrant.
    Returns number of chunks stored, or 0 on failure.
    """
    qdrant = await _get_qdrant()
    if qdrant is None:
        logger.warning("Qdrant not available — skipping ingest of %s", doc_name)
        return 0

    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = await _embed_batch(chunks)

    from qdrant_client.models import PointStruct  # type: ignore
    points = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        if emb is None:
            continue
        points.append(PointStruct(
            id=str(_uuid.uuid4()),
            vector=emb,
            payload={
                "doc_id": doc_id,
                "doc_name": doc_name,
                "chunk_text": chunk,
                "chunk_index": i,
            },
        ))

    if points:
        await qdrant.upsert(collection_name=QDRANT_COLLECTION, points=points, wait=True)
        logger.info("Ingested %d chunks for doc=%s", len(points), doc_name)

    return len(points)


async def delete_doc(doc_id: str) -> None:
    qdrant = await _get_qdrant()
    if qdrant is None:
        return
    from qdrant_client.models import Filter, FieldCondition, MatchValue  # type: ignore
    await qdrant.delete(
        collection_name=QDRANT_COLLECTION,
        points_selector=Filter(must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]),
        wait=True,
    )


# ── Query + stream response ───────────────────────────────────────────────────

AGRI_SYSTEM_PROMPT = """You are AgriMind, an expert agricultural AI assistant.
You have access to the farmer's own uploaded knowledge documents AND their farm context below.
Answer ONLY based on the retrieved context and farm data. Be specific and actionable.
If you cannot find relevant information, say so clearly and suggest consulting a local KVK officer.
Always cite which source or document your answer comes from.
Format responses clearly — use numbered steps for treatments and bullet points for lists."""


async def query_and_stream(
    question: str,
    farm_context: Optional[str] = None,
    top_k: int = TOP_K,
) -> AsyncGenerator[dict, None]:
    """
    Retrieves relevant chunks from Qdrant, builds context with farm data,
    then streams the Ollama LLM response token by token.

    Yields dicts:
      {"type": "token",   "content": str}
      {"type": "sources", "sources": list[dict]}
      {"type": "done"}
      {"type": "error",   "message": str}
    """
    # 1. Embed query
    query_emb = await _embed(question)

    sources: list[dict] = []
    context_parts: list[str] = []

    if query_emb is not None:
        qdrant = await _get_qdrant()
        if qdrant is not None:
            try:
                results = await qdrant.search(
                    collection_name=QDRANT_COLLECTION,
                    query_vector=query_emb,
                    limit=top_k,
                    with_payload=True,
                )
                for i, r in enumerate(results):
                    p = r.payload
                    sources.append({
                        "doc_id": p.get("doc_id", ""),
                        "doc_name": p.get("doc_name", "Document"),
                        "chunk_text": p.get("chunk_text", ""),
                        "score": round(r.score, 3),
                        "chunk_index": p.get("chunk_index", 0),
                    })
                    context_parts.append(
                        f"[Source {i+1}: {p.get('doc_name', 'Document')}]\n{p.get('chunk_text', '')}"
                    )
            except Exception as exc:
                logger.warning("Qdrant search failed: %s", exc)

    # 2. Build system prompt with farm context
    context_str = "\n\n---\n\n".join(context_parts) if context_parts else ""

    if farm_context:
        system = (
            AGRI_SYSTEM_PROMPT
            + f"\n\n## Farmer's Context\n{farm_context}\n"
        )
    else:
        system = AGRI_SYSTEM_PROMPT

    if context_str:
        full_system = (
            system
            + f"\n\n## Relevant Knowledge Base Documents\n\n{context_str}\n\n"
            "Use the above documents to answer the question accurately."
        )
    else:
        full_system = system + "\n\nNote: No relevant documents found. Answer from general agricultural knowledge."

    # 3. Stream from Ollama
    try:
        from ollama import AsyncClient  # type: ignore
        client = AsyncClient(host=OLLAMA_URL)
        messages = [
            {"role": "system", "content": full_system},
            {"role": "user", "content": question},
        ]
        async for chunk in await client.chat(model=CHAT_MODEL, messages=messages, stream=True):
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield {"type": "token", "content": content}

        yield {"type": "sources", "sources": sources}
        yield {"type": "done"}

    except Exception as exc:
        logger.error("LLM streaming error: %s", exc)
        # Fallback: return keyword-based answer if Ollama is down
        answer = _keyword_fallback(question)
        yield {"type": "token", "content": answer}
        yield {"type": "sources", "sources": sources}
        yield {"type": "done"}


# ── Synchronous keyword fallback (when Ollama is offline) ─────────────────────

_FALLBACK_KB = [
    {
        "topic": "late blight tomato blight",
        "content": "Late blight is caused by Phytophthora infestans. Apply copper-based fungicide every 7 days. Remove infected leaves. Avoid overhead irrigation.",
        "source": "ICAR Disease Management Guide 2024",
    },
    {
        "topic": "early blight alternaria tomato",
        "content": "Early blight (Alternaria solani): Spray chlorothalonil every 10 days. Mulch soil. Remove lower infected leaves. Practice 2-year crop rotation.",
        "source": "ICAR Disease Management Guide 2024",
    },
    {
        "topic": "irrigation water tomato",
        "content": "Tomatoes need 25-30mm water per week. Use drip irrigation. Water in early morning to reduce fungal risk.",
        "source": "FAO Irrigation Paper No. 56",
    },
    {
        "topic": "npk fertilizer rice nitrogen",
        "content": "Rice needs 100-120 kg N/ha split into 3 applications. Add 50 kg P2O5 and 40 kg K2O per hectare.",
        "source": "IRRI Rice Knowledge Bank",
    },
    {
        "topic": "aphid pest neem insect",
        "content": "For aphids: Spray neem oil (3%) every 7 days. Introduce ladybugs. Avoid broad-spectrum insecticides.",
        "source": "CABI Crop Protection Compendium",
    },
    {
        "topic": "soil ph acid alkaline lime",
        "content": "Optimal crop pH: 6.0-7.0. Add lime to raise pH, sulfur to lower it. Test soil every 2 years.",
        "source": "Soil Science Society of India",
    },
    {
        "topic": "rice blast fungus",
        "content": "Rice blast (Magnaporthe oryzae): Apply tricyclazole at booting stage. Avoid excess nitrogen. Use resistant varieties.",
        "source": "IRRI Rice Knowledge Bank",
    },
    {
        "topic": "wheat rust fungicide",
        "content": "Wheat rust (Puccinia): Apply propiconazole at first pustule. Plant resistant varieties. Destroy volunteer plants.",
        "source": "ICAR Wheat Research Directorate",
    },
]


def _keyword_fallback(question: str) -> str:
    q = question.lower()
    scores: list[tuple[float, dict]] = []
    for doc in _FALLBACK_KB:
        score = sum(1.0 for w in q.split() if len(w) > 3 and w in doc["topic"])
        if score > 0:
            scores.append((score, doc))
    scores.sort(key=lambda x: x[0], reverse=True)
    if not scores:
        return (
            "I don't have enough information in my knowledge base for this question. "
            "Please consult your local Krishi Vigyan Kendra (KVK) or agricultural extension officer, "
            "or upload relevant agricultural documents in the Knowledge Base page."
        )
    top = scores[0][1]
    answer = top["content"]
    if len(scores) > 1:
        answer += "\n\n" + scores[1][1]["content"]
    return answer


# ── Context builder from user farm data ───────────────────────────────────────

def build_farm_context(user_data: dict) -> str:
    """
    Build a plain-text farm context string from user scan history,
    farm/field records, and profile — injected into the RAG system prompt.
    """
    parts: list[str] = []

    if user_data.get("location"):
        parts.append(f"Farmer location: {user_data['location']}")

    farms = user_data.get("farms", [])
    if farms:
        farm_lines = []
        for f in farms[:3]:  # limit to 3 farms
            line = f"- Farm '{f.get('name')}' at {f.get('location')}"
            if f.get("area_acres"):
                line += f" ({f['area_acres']} acres)"
            fields = f.get("fields", [])
            if fields:
                crops = ", ".join(
                    f"{fl['crop']} ({fl.get('crop_age_days', '?')} days old)"
                    for fl in fields[:4]
                )
                line += f" — Crops: {crops}"
            farm_lines.append(line)
        parts.append("Farms:\n" + "\n".join(farm_lines))

    recent = user_data.get("recent_scans", [])
    if recent:
        scan_lines = []
        for s in recent[:5]:
            scan_lines.append(f"- {s.get('date', '')}: {s.get('summary', '')}")
        parts.append("Recent scan history:\n" + "\n".join(scan_lines))

    return "\n\n".join(parts) if parts else ""
