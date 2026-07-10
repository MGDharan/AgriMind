import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rag_pipeline import query_and_stream
from app.database import AsyncSessionFactory, get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.schemas import (
    ChatMessageResponse,
    ChatRequest,
    ChatSessionResponse,
    CreateSessionRequest,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completions")
async def chat_completions(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """SSE streaming chat endpoint with RAG."""
    # Resolve or create session
    session_id: str
    if request.session_id:
        session = await db.get(ChatSession, request.session_id)
        if not session:
            raise HTTPException(404, "Session not found")
        session_id = session.id
    else:
        title = "New Chat"
        for msg in request.messages:
            if msg.role == "user":
                title = msg.content[:60] + ("..." if len(msg.content) > 60 else "")
                break
        session = ChatSession(title=title)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id

    # Persist user message
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_msg = ChatMessage(
                session_id=session_id, role="user", content=msg.content
            )
            db.add(user_msg)
            await db.commit()
            break

    messages_dicts = [
        {"role": m.role, "content": m.content} for m in request.messages
    ]
    top_k = request.top_k

    async def generator() -> AsyncGenerator[str, None]:
        full_response = ""
        sources_data = None

        yield f"data: {json.dumps({'type': 'session_id', 'session_id': session_id})}\n\n"

        try:
            async for event in query_and_stream(messages_dicts, top_k=top_k):
                if event["type"] == "token":
                    full_response += event["content"]
                    yield f"data: {json.dumps(event)}\n\n"
                elif event["type"] == "sources":
                    sources_data = event.get("sources", [])
                    yield f"data: {json.dumps({'type': 'sources', 'sources': sources_data})}\n\n"
                elif event["type"] == "done":
                    # Persist assistant reply in a fresh session
                    async with AsyncSessionFactory() as save_db:
                        assistant_msg = ChatMessage(
                            session_id=session_id,
                            role="assistant",
                            content=full_response,
                            sources=sources_data,
                        )
                        save_db.add(assistant_msg)
                        await save_db.commit()
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                elif event["type"] == "error":
                    yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.error("Chat stream error", error=str(exc))
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatSession).order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    req: CreateSessionRequest, db: AsyncSession = Depends(get_db)
):
    session = ChatSession(title=req.title or "New Chat")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def get_session_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}
