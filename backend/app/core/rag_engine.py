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

from qdrant_client.models import Filter, FieldCondition, MatchValue  # type: ignore

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


def _stable_point_id(doc_id: str, chunk_index: int) -> str:
    key = f"{doc_id}:{chunk_index}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


async def ingest_text(
    doc_id: str,
    doc_name: str,
    text: str,
    user_id: int | None = None,
    stable_ids: bool = False,
) -> int:
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

    if stable_ids:
        await delete_doc(doc_id)

    embeddings = await _embed_batch(chunks)

    from qdrant_client.models import PointStruct  # type: ignore
    points = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        if emb is None:
            continue
        point_id = _stable_point_id(doc_id, i) if stable_ids else str(_uuid.uuid4())
        payload = {
            "doc_id": doc_id,
            "doc_name": doc_name,
            "chunk_text": chunk,
            "chunk_index": i,
        }
        if user_id is not None:
            payload["user_id"] = user_id
        points.append(PointStruct(
            id=point_id,
            vector=emb,
            payload=payload,
        ))

    if points:
        await qdrant.upsert(collection_name=QDRANT_COLLECTION, points=points, wait=True)
        logger.info("Ingested %d chunks for doc=%s user_id=%s", len(points), doc_name, user_id)

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
Format responses clearly — use numbered steps for treatments and bullet points for lists.

IMPORTANT — Scope rules:
- If the user asks about WEATHER, temperature, rain forecast, or current conditions, do NOT guess.
  Instead reply: "For real-time weather, please use the Weather tab in the sidebar — it shows current
  conditions and a 7-day forecast for your farm location."
- If the user asks anything clearly unrelated to agriculture (sports, movies, stocks, etc.),
  politely decline and redirect them to agricultural topics.
- Never fabricate data you do not have in the context."""


async def query_and_stream(
    question: str,
    farm_context: Optional[str] = None,
    user_id: Optional[int] = None,
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
                qdrant_filter = None
                if user_id is not None:
                    qdrant_filter = Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))])

                results = await qdrant.search(
                    collection_name=QDRANT_COLLECTION,
                    query_vector=query_emb,
                    limit=top_k,
                    with_payload=True,
                    filter=qdrant_filter,
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

# Topics that are clearly outside the agricultural knowledge scope
_NON_AGRI_KEYWORDS = [
    "weather", "temperature", "rain", "rainfall", "humidity", "forecast",
    "wind", "storm", "climate", "sunrise", "sunset", "cloud",
    "score", "sport", "cricket", "football", "movie", "news",
    "stock", "share", "market price",
]

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
    {
        "topic": "nitrogen deficiency yellowing leaves crop",
        "content": "Nitrogen deficiency shows as yellowing of older/lower leaves first. Apply urea (46-0-0) at 25 kg/acre. Confirmed with soil test.",
        "source": "ICAR Nutrient Management Guide",
    },
    {
        "topic": "wheat irrigation water requirement",
        "content": "Wheat requires 4-6 critical irrigations: crown root initiation, tillering, jointing, flowering, milk stage, and dough stage. Total 35-40 cm water.",
        "source": "ICAR Wheat Research Directorate",
    },
]


def _keyword_fallback(question: str) -> str:
    import difflib
    q = question.lower()

    # ── Check if question is clearly outside agricultural scope ───────────────
    non_agri_match = [kw for kw in _NON_AGRI_KEYWORDS if kw in q]
    if non_agri_match:
        topic = non_agri_match[0]
        if topic in ("weather", "temperature", "rain", "rainfall", "humidity",
                     "forecast", "wind", "storm", "climate", "sunrise", "sunset", "cloud"):
            return (
                "I'm AgriMind, an agricultural AI assistant. I'm not able to provide real-time "
                "weather data here.\n\n"
                "To check your local weather, please use the **Weather** tab in the sidebar — "
                "it shows current conditions and a 7-day forecast for your farm location."
            )
        return (
            f"I'm AgriMind, specialized in agricultural topics. I can't answer questions about "
            f"{topic} here. Try asking about crop diseases, irrigation, soil health, "
            f"fertilizers, or pests instead."
        )

    # ── Agricultural keyword matching ─────────────────────────────────────────
    scores: list[tuple[float, dict]] = []
    for doc in _FALLBACK_KB:
        # Fixed: parentheses added to avoid operator precedence bug
        # (previously `len(w) > 3 and w in topic or w in content` was
        #  parsed as `(len(w) > 3 and w in topic) or (w in content)`,
        #  causing short words like 'is', 'in', 'my' to always match)
        token_score = sum(
            1.0 for w in q.split()
            if len(w) > 3 and (w in doc["topic"] or w in doc["content"].lower())
        )
        # fuzzy similarity against topic keywords only (not the full content)
        sim = difflib.SequenceMatcher(a=q, b=doc["topic"]).ratio()
        score = token_score * 1.5 + sim * 2.0
        if score > 0.5:
            scores.append((score, doc))

    scores.sort(key=lambda x: x[0], reverse=True)

    if not scores:
        return (
            "I don't have enough information in my knowledge base to answer that question.\n\n"
            "You can:\n"
            "1. Upload relevant agricultural documents using the Upload button on the right."
            "\n2. Ask about specific crop diseases, irrigation, fertilizers, or pests."
            "\n3. Consult your local Krishi Vigyan Kendra (KVK) or agricultural extension officer."
        )

    # Build an aggregated short answer from the top 2 matches
    top = scores[0][1]
    answer = top["content"]
    if len(scores) > 1 and scores[1][0] > 0.6:
        answer += "\n\n" + scores[1][1]["content"]

    # If low confidence, add a disclaimer
    if scores[0][0] < 1.5:
        suggested = [d[1]["topic"].split()[0] for d in scores[:3]]
        answer += "\n\nSuggested related topics: " + ", ".join(suggested)
        answer += ". Upload documents for more precise, context-specific answers."

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
