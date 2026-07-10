# RAG Chatbot — Local AI Knowledge Base

A production-ready, **fully local** RAG (Retrieval-Augmented Generation) chatbot. No cloud APIs. No data leaves your machine.

## Stack

| Layer | Technology |
|---|---|
| **LLM** | Ollama (`llama3.2`) |
| **Embeddings** | Ollama (`nomic-embed-text`) |
| **Vector DB** | Qdrant |
| **Backend** | FastAPI + SQLAlchemy (async) |
| **Metadata DB** | PostgreSQL |
| **Frontend** | Next.js 14 + Tailwind CSS + Zustand |
| **Orchestration** | Docker Compose |

## Features

- 📄 **Multi-format uploads** — PDF, DOCX, TXT, Markdown, CSV
- 🔍 **Semantic search** — cosine similarity via Qdrant
- 💬 **Streaming responses** — SSE token-by-token, ChatGPT-style
- 📚 **Source citations** — expandable per-message source list
- 🗂 **Chat history** — persisted in PostgreSQL, resumed across sessions
- 🗑 **Document management** — delete documents, chunks removed from Qdrant automatically
- 🐳 **Docker Compose** — one command to run everything

## Quick Start

### Prerequisites

- Docker Desktop (with Compose v2)
- ~8 GB RAM (for Ollama models)
- Optional: NVIDIA GPU (uncomment GPU block in `docker-compose.yml`)

### 1. Copy environment file

```bash
cp .env.example .env
```

### 2. Start all services

```bash
docker compose up -d
```

The first run will:
1. Start PostgreSQL, Qdrant, Ollama
2. Pull `llama3.2` (~2 GB) and `nomic-embed-text` (~300 MB) — this may take a few minutes
3. Build and start the FastAPI backend
4. Build and start the Next.js frontend

### 3. Open the app

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **Qdrant Dashboard** | http://localhost:6333/dashboard |

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start services: postgres, qdrant, ollama (locally)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
RAG+MCP/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app factory
│   │   ├── config.py           # Settings
│   │   ├── database.py         # SQLAlchemy async engine
│   │   ├── api/v1/             # REST endpoints
│   │   ├── core/               # RAG pipeline, embeddings, LLM, chunker, vector store
│   │   ├── extractors/         # PDF, DOCX, TXT, MD, CSV
│   │   ├── models/             # ORM + Pydantic schemas
│   │   └── utils/
└── frontend/
    └── src/
        ├── app/                # Next.js App Router
        ├── components/         # Chat, Documents, Layout
        ├── hooks/              # useChat, useDocuments
        ├── store/              # Zustand global state
        └── lib/                # API client, types
```

## API Reference

### Documents
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Upload a document |
| `GET` | `/api/v1/documents/` | List all documents |
| `GET` | `/api/v1/documents/{id}` | Get document details |
| `DELETE` | `/api/v1/documents/{id}` | Delete document |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/chat/completions` | Stream a chat completion |
| `GET` | `/api/v1/chat/sessions` | List chat sessions |
| `POST` | `/api/v1/chat/sessions` | Create new session |
| `GET` | `/api/v1/chat/sessions/{id}/messages` | Get session messages |
| `DELETE` | `/api/v1/chat/sessions/{id}` | Delete session |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health check |

## MCP Integration (Future)

The core RAG logic is isolated in `backend/app/core/`:
- `rag_pipeline.ingest_document()` → can be exposed as an MCP tool
- `rag_pipeline.query_and_stream()` → can be exposed as an MCP tool
- `vector_store.*` → individually callable

Add an `app/mcp/` directory and register tools there without touching existing routes.

## Configuration

All settings are in `.env`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_CHAT_MODEL` | `llama3.2` | Chat model |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model |
| `CHUNK_SIZE` | `512` | Characters per chunk |
| `CHUNK_OVERLAP` | `64` | Overlap between chunks |
| `TOP_K` | `5` | Retrieved chunks per query |

## License

MIT
