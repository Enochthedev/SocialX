import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_llm_model: str = "anthropic/claude-3.5-sonnet"

    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "socialx"
    postgres_user: str = "socialx_user"
    postgres_password: str = ""

    # ChromaDB
    chromadb_host: str = "localhost"
    chromadb_port: int = 8000

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""

    # Learning
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    personality_update_threshold: float = 0.7
    min_samples_for_learning: int = 10

    # API
    ai_engine_port: int = 5000

    # Environment
    python_env: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = "../.env"
        case_sensitive = False
        extra = "ignore"

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}"
        return f"redis://{self.redis_host}:{self.redis_port}"


settings = Settings()
