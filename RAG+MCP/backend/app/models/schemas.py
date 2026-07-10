from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any
from app.models.document import DocumentStatus


# ── Document ──────────────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    name: str
    original_name: str
    file_type: str
    size: int
    chunk_count: int
    status: DocumentStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


# ── Chat ──────────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    messages: list[Message]
    top_k: int = Field(default=5, ge=1, le=20)


class Source(BaseModel):
    doc_id: str
    doc_name: str
    chunk_text: str
    score: float
    chunk_index: int


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Chat"
