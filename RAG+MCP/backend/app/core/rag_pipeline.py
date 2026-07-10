from pathlib import Path
from typing import AsyncGenerator, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.chunker import chunk_text
from app.core.embeddings import get_embeddings, get_query_embedding
from app.core.llm import stream_chat
from app.core.vector_store import search_similar, upsert_chunks
from app.extractors import get_extractor
from app.models.document import Document, DocumentStatus
from app.models.schemas import Source
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def ingest_document(
    file_path: Path,
    doc_id: str,
    doc_name: str,
    file_type: str,
    db: AsyncSession,
) -> int:
    """Full ingestion pipeline: extract → chunk → embed → store."""
    doc = await db.get(Document, doc_id)
    if not doc:
        raise ValueError(f"Document {doc_id} not found")

    doc.status = DocumentStatus.PROCESSING
    await db.commit()

    try:
        # 1. Extract text
        extractor = get_extractor(file_type)
        pages = extractor.extract(file_path)
        full_text = "\n\n".join(pages)

        if not full_text.strip():
            raise ValueError("No text could be extracted from the document")

        # 2. Chunk
        chunks = chunk_text(full_text)
        if not chunks:
            raise ValueError("No chunks were generated")

        logger.info("Document chunked", doc_id=doc_id, chunks=len(chunks))

        # 3. Embed
        embeddings = await get_embeddings(chunks)

        # 4. Store in Qdrant
        await upsert_chunks(doc_id, doc_name, chunks, embeddings, file_type)

        # 5. Update DB
        doc.status = DocumentStatus.READY
        doc.chunk_count = len(chunks)
        await db.commit()

        logger.info("Ingestion complete", doc_id=doc_id, chunks=len(chunks))
        return len(chunks)

    except Exception as exc:
        logger.error("Ingestion failed", doc_id=doc_id, error=str(exc))
        doc = await db.get(Document, doc_id)
        if doc:
            doc.status = DocumentStatus.FAILED
            doc.error_message = str(exc)
            await db.commit()
        raise


async def query_and_stream(
    messages: List[dict],
    top_k: int = 5,
) -> AsyncGenerator[dict, None]:
    """Query pipeline: embed query → search → stream response."""
    # Find the last user message
    user_query = ""
    for msg in reversed(messages):
        if msg["role"] == "user":
            user_query = msg["content"]
            break

    if not user_query:
        yield {"type": "error", "message": "No user message found"}
        return

    # 1. Embed query
    query_embedding = await get_query_embedding(user_query)

    # 2. Search Qdrant
    results = await search_similar(query_embedding, top_k=top_k)

    # 3. Build context + sources
    sources: List[Source] = []
    context_parts: List[str] = []

    for i, result in enumerate(results):
        p = result.payload
        sources.append(
            Source(
                doc_id=p["doc_id"],
                doc_name=p["doc_name"],
                chunk_text=p["chunk_text"],
                score=result.score,
                chunk_index=p["chunk_index"],
            )
        )
        context_parts.append(
            f"[Source {i + 1}: {p['doc_name']}]\n{p['chunk_text']}"
        )

    context = "\n\n---\n\n".join(context_parts)

    # 4. Stream LLM response
    ollama_messages = [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]

    full_response = ""
    async for token in stream_chat(ollama_messages, context):
        full_response += token
        yield {"type": "token", "content": token}

    # 5. Emit sources + done
    yield {
        "type": "sources",
        "sources": [s.model_dump() for s in sources],
        "full_response": full_response,
    }
    yield {"type": "done"}
