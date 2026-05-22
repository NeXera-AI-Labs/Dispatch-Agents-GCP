from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Vertex AI
    google_project_id: str
    vertex_location: str = "us-central1"
    vertex_model: str = "gemini-2.5-flash"

    # cap-srv on Cloud Run (public, no auth for now)
    cap_base_url: str

    # Teams webhook
    teams_webhook_url: str

    # LangChain tracing (optional)
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "dispatch-agents"

    # Monitor thresholds
    monitor_poll_interval_sec: int = 300
    unassigned_threshold_min: int = 30
    idle_threshold_min: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
