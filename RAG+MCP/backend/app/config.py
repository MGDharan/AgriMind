from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://raguser:ragpass@postgres:5432/ragdb"

    # Qdrant
    qdrant_host: str = "qdrant"
    qdrant_port: int = 6333
    qdrant_collection_name: str = "documents"

    # Ollama
    ollama_base_url: str = "http://ollama:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_chat_model: str = "llama3:latest"

    # RAG
    chunk_size: int = 512
    chunk_overlap: int = 64
    top_k: int = 5
    embedding_dim: int = 768

    # App
    app_name: str = "RAG Chatbot"
    debug: bool = False
    max_upload_size: int = 50 * 1024 * 1024  # 50 MB

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://frontend:3000"]


settings = Settings()
