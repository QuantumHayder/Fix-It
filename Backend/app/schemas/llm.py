from pydantic import BaseModel, ConfigDict, Field

from app.llm.schemas import InspectionSummary


class ModelInfo(BaseModel):
    name: str
    digest: str
    parameter_size: str | None
    quantization: str | None
    size_bytes: int | None


class ModelsResponse(BaseModel):
    default_model: str
    models: list[ModelInfo]


class SummarizeRequest(BaseModel):
    # empty = use the default model from the settings
    model: str | None = Field(default=None, max_length=200)


class LLMCallResponse(BaseModel):
    """One model call, without the (long) prompt and answer."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    snapshot_id: int
    model_name: str
    model_version: str
    purpose: str
    timestamp: str
    duration_ms: int
    input_tokens: int | None
    output_tokens: int | None
    token_count_source: str
    status: str
    error_message: str | None


class LLMCallDetail(LLMCallResponse):
    """Full call, including exactly what was sent and received."""
    input: str
    output: str | None


class SummarizeResponse(BaseModel):
    summary: InspectionSummary
    # problems we found in the answer, e.g. the model mentioned an unknown element
    warnings: list[str]
    call: LLMCallResponse


class LLMUsageResponse(BaseModel):
    """Usage for one snapshot (page-level)."""
    call_count: int
    successful_calls: int
    average_duration_ms: int | None  # successful calls only
    total_input_tokens: int
    total_output_tokens: int
    calls: list[LLMCallResponse]
