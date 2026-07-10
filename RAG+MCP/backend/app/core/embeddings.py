import asyncio
from typing import List

from ollama import Client

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def _embed_single(text: str) -> List[float]:
    """Get embedding for a single text using Ollama (run in thread pool)."""
    loop = asyncio.get_event_loop()
    client = Client(host=settings.ollama_base_url)
    response = await loop.run_in_executor(
        None,
        lambda: client.embeddings(
            model=settings.ollama_embed_model,
            prompt=text,
        ),
    )
    return response["embedding"]


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings for a list of texts (batched)."""
    batch_size = 8
    all_embeddings: List[List[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        embeddings = await asyncio.gather(*[_embed_single(t) for t in batch])
        all_embeddings.extend(embeddings)
        logger.info("Embedding batch", batch=i // batch_size + 1, count=len(batch))

    return all_embeddings


async def get_query_embedding(query: str) -> List[float]:
    """Get embedding for a search query."""
    return await _embed_single(query)
