import httpx
from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.core.vector_store import get_qdrant_client
from app.database import AsyncSessionFactory

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    health: dict = {"status": "ok", "services": {}}

    # PostgreSQL
    try:
        async with AsyncSessionFactory() as db:
            await db.execute(text("SELECT 1"))
        health["services"]["postgres"] = "ok"
    except Exception as exc:
        health["services"]["postgres"] = f"error: {exc}"
        health["status"] = "degraded"

    # Qdrant
    try:
        client = get_qdrant_client()
        await client.get_collections()
        health["services"]["qdrant"] = "ok"
    except Exception as exc:
        health["services"]["qdrant"] = f"error: {exc}"
        health["status"] = "degraded"

    # Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                health["services"]["ollama"] = {"status": "ok", "models": models}
            else:
                health["services"]["ollama"] = f"http_{resp.status_code}"
                health["status"] = "degraded"
    except Exception as exc:
        health["services"]["ollama"] = f"error: {exc}"
        health["status"] = "degraded"

    return health
