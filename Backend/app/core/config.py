from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Backend/.env, resolved from this file so it works regardless of the launch directory
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    SQLALCHEMY_DATABASE_URL: str
    JWT_SECRET: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, gt=0)
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Runner (browser jobs). Empty RUNNER_PYTHON = use the same Python as the backend.
    RUNNER_PYTHON: str = ""
    RUNNER_HEADLESS: bool = False  # the brief asks for a visible browser
    INSPECTION_TIMEOUT_SECONDS: int = Field(default=90, gt=0)

    # Local model through Ollama (free, runs on our own GPU)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    LLM_TIMEOUT_SECONDS: int = Field(default=180, gt=0)  # first call also loads the model into the GPU
    LLM_TEMPERATURE: float = 0.2  # low = more predictable answers
    LLM_NUM_CTX: int = 8192  # context window in tokens

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")


settings = Settings()