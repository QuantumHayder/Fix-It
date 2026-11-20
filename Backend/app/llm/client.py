"""The only file that talks to the model (Ollama's HTTP API).

Keeping every model call here means we can switch models (or providers)
without touching the rest of the app.
"""
import time
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.exceptions import LLMError


@dataclass
class LLMResponse:
    status: str                     # "success" or "error"
    content: str | None             # the model's text answer
    duration_ms: int                # model response time (measured by us)
    input_tokens: int | None
    output_tokens: int | None
    token_count_source: str         # "runtime" (from Ollama) or "estimated"
    error_message: str | None = None


def list_models() -> list[dict]:
    """Models installed in Ollama, for the model selector."""
    try:
        response = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
        response.raise_for_status()
    except httpx.HTTPError:
        raise LLMError("Ollama is not running. Start it with 'ollama serve'.")

    models = []
    for m in response.json().get("models", []):
        details = m.get("details", {})
        models.append({
            "name": m["name"],
            "digest": m["digest"],  # exact model version
            "parameter_size": details.get("parameter_size"),
            "quantization": details.get("quantization_level"),
            "size_bytes": m.get("size"),
        })
    return models


def get_model(name: str) -> dict:
    for m in list_models():
        if m["name"] == name:
            return m
    raise LLMError(f"Model '{name}' is not installed. Run: ollama pull {name}")


def _estimate_tokens(text: str) -> int:
    # rough rule of thumb: about 4 characters per token
    return max(1, len(text) // 4)


def chat(messages: list[dict], model: str, output_schema: dict | None = None) -> LLMResponse:
    """Send a chat to the model. Never raises for model errors; the error is
    returned in the response so the caller can still log the failed call."""
    body = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": settings.LLM_TEMPERATURE,
            "num_ctx": settings.LLM_NUM_CTX,
        },
    }
    if output_schema:
        body["format"] = output_schema  # Ollama forces the answer to match this JSON schema

    prompt_text = "\n\n".join(m["content"] for m in messages)
    start = time.perf_counter()
    try:
        response = httpx.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json=body,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as e:
        return LLMResponse(
            status="error",
            content=None,
            duration_ms=int((time.perf_counter() - start) * 1000),
            input_tokens=_estimate_tokens(prompt_text),
            output_tokens=None,
            token_count_source="estimated",
            error_message=f"{type(e).__name__}: {e}",
        )
    duration_ms = int((time.perf_counter() - start) * 1000)

    content = data["message"]["content"]

    # Ollama reports real token counts. prompt_eval_count can be missing when
    # the prompt was cached, then we estimate and label it as an estimate.
    if "prompt_eval_count" in data and "eval_count" in data:
        input_tokens = data["prompt_eval_count"]
        output_tokens = data["eval_count"]
        source = "runtime"
    else:
        input_tokens = _estimate_tokens(prompt_text)
        output_tokens = _estimate_tokens(content)
        source = "estimated"

    return LLMResponse(
        status="success",
        content=content,
        duration_ms=duration_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        token_count_source=source,
    )
