"""Application configuration via pydantic-settings (env-driven)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — Postgres in prod; SQLite fallback for local dev.
    database_url: str = "sqlite:///./ethara.db"

    # CORS — comma-separated list of allowed origins.
    cors_origins_raw: str = "http://localhost:3000"

    # Groq (AI assistant) — set in Phase 8 / deploy.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]


settings = Settings()
