import uuid
from typing import List, Optional

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    ScoredPoint,
    VectorParams,
)

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_client: Optional[AsyncQdrantClient] = None


def get_qdrant_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
        )
    return _client


async def ensure_collection() -> None:
    """Create Qdrant collection if it does not exist."""
    client = get_qdrant_client()
    collections = await client.get_collections()
    existing = {c.name for c in collections.collections}

    if settings.qdrant_collection_name not in existing:
        await client.create_collection(
            collection_name=settings.qdrant_collection_name,
            vectors_config=VectorParams(
                size=settings.embedding_dim,
                distance=Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection", name=settings.qdrant_collection_name)
    else:
        logger.info("Qdrant collection exists", name=settings.qdrant_collection_name)


async def upsert_chunks(
    doc_id: str,
    doc_name: str,
    chunks: List[str],
    embeddings: List[List[float]],
    file_type: str,
) -> None:
    """Store document chunks and their embeddings."""
    client = get_qdrant_client()

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "doc_id": doc_id,
                "doc_name": doc_name,
                "chunk_text": chunk,
                "chunk_index": i,
                "file_type": file_type,
            },
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    await client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=points,
        wait=True,
    )
    logger.info("Upserted chunks to Qdrant", doc_id=doc_id, count=len(points))


async def search_similar(
    query_embedding: List[float],
    top_k: int = 5,
) -> List[ScoredPoint]:
    """Cosine-similarity search."""
    client = get_qdrant_client()

    results = await client.search(
        collection_name=settings.qdrant_collection_name,
        query_vector=query_embedding,
        limit=top_k,
        with_payload=True,
    )
    return results


async def delete_document_chunks(doc_id: str) -> None:
    """Remove all vectors for a given document."""
    client = get_qdrant_client()

    await client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="doc_id",
                    match=MatchValue(value=doc_id),
                )
            ]
        ),
        wait=True,
    )
    logger.info("Deleted document chunks from Qdrant", doc_id=doc_id)


async def count_document_chunks(doc_id: str) -> int:
    """Count vector points for a document."""
    client = get_qdrant_client()

    result = await client.count(
        collection_name=settings.qdrant_collection_name,
        count_filter=Filter(
            must=[
                FieldCondition(
                    key="doc_id",
                    match=MatchValue(value=doc_id),
                )
            ]
        ),
    )
    return result.count
