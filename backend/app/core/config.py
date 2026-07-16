from functools import lru_cache
import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AgriMind AI Platform"
    app_version: str = "1.0.0"
    database_url: str = "sqlite:///agriculture.db"
    mysql_host: str = os.getenv("MYSQL_HOST", "")
    mysql_user: str = os.getenv("MYSQL_USER", "root")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")
    mysql_db: str = os.getenv("MYSQL_DB", "agriculture")
    mysql_port: str = os.getenv("MYSQL_PORT", "3306")
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_oauth_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    frontend_url: str = "http://localhost:5173"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"
    weather_api_key: str = ""
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "agriculture"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://agrimind-do4.pages.dev"
    upload_max_mb: int = 10
    upload_dir: str = "uploads"
    # Qdrant vector store
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "agrimind_knowledge"
    embedding_dim: int = 768
    # RAG
    chunk_size: int = 512
    chunk_overlap: int = 64
    rag_top_k: int = 5
    # Email / SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sync_database_url(self) -> str:
        if self.database_url != "sqlite:///agriculture.db":
            url = self.database_url
        elif self.mysql_host:
            if self.mysql_host.startswith("mysql://") or self.mysql_host.startswith("mysql+pymysql://"):
                url = self.mysql_host
                if url.startswith("mysql://"):
                    url = url.replace("mysql://", "mysql+pymysql://", 1)
            else:
                url = f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
        else:
            url = self.database_url

        if os.getenv("RENDER") == "true" and ("127.0.0.1" in url or "localhost" in url) and not url.startswith("sqlite"):
            url = "sqlite:///agriculture.db"
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    @property
    def sync_frontend_url(self) -> str:
        url = self.frontend_url
        if os.getenv("RENDER") == "true" and ("localhost" in url or "127.0.0.1" in url):
            url = "https://agrimind-do4.pages.dev"
        return url



@lru_cache
def get_settings() -> Settings:
    return Settings()
