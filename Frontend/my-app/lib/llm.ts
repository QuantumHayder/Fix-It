import { z } from "zod";

// ---------- models (GET /llm/models) ----------

const ModelInfoSchema = z
  .object({
    name: z.string(),
    digest: z.string(),
    parameter_size: z.string().nullable(),
    quantization: z.string().nullable(),
    size_bytes: z.number().nullable(),
  })
  .transform((m) => ({
    name: m.name,
    digest: m.digest,
    parameterSize: m.parameter_size,
    quantization: m.quantization,
    sizeBytes: m.size_bytes,
  }));

export const ModelsResponseSchema = z
  .object({ default_model: z.string(), models: z.array(ModelInfoSchema) })
  .transform((r) => ({ defaultModel: r.default_model, models: r.models }));

// ---------- one model call (LLMCall row) ----------

const llmCallFields = {
  id: z.number(),
  snapshot_id: z.number(),
  model_name: z.string(),
  model_version: z.string(),
  purpose: z.string(),
  timestamp: z.string(),
  duration_ms: z.number(),
  input_tokens: z.number().nullable(),
  output_tokens: z.number().nullable(),
  token_count_source: z.enum(["runtime", "estimated", "unavailable"]),
  status: z.enum(["success", "error", "cancelled"]),
  error_message: z.string().nullable(),
};

function toCall(c: z.infer<z.ZodObject<typeof llmCallFields>>) {
  return {
    id: c.id,
    snapshotId: c.snapshot_id,
    modelName: c.model_name,
    modelVersion: c.model_version, // Ollama digest = exact model version
    purpose: c.purpose,
    timestamp: c.timestamp,
    durationMs: c.duration_ms,
    inputTokens: c.input_tokens,
    outputTokens: c.output_tokens,
    tokenCountSource: c.token_count_source,
    status: c.status,
    errorMessage: c.error_message,
  };
}

export const LLMCallSchema = z.object(llmCallFields).transform(toCall);

// Same call plus the exact prompt and answer (GET /llm-calls/{id})
export const LLMCallDetailSchema = z
  .object({ ...llmCallFields, input: z.string(), output: z.string().nullable() })
  .transform((c) => ({ ...toCall(c), input: c.input, output: c.output }));

// ---------- page-level usage (GET /snapshots/{id}/llm-calls) ----------

export const LLMUsageSchema = z
  .object({
    call_count: z.number(),
    successful_calls: z.number(),
    average_duration_ms: z.number().nullable(), // successful calls only
    total_input_tokens: z.number(),
    total_output_tokens: z.number(),
    calls: z.array(LLMCallSchema),
  })
  .transform((u) => ({
    callCount: u.call_count,
    successfulCalls: u.successful_calls,
    averageDurationMs: u.average_duration_ms,
    totalInputTokens: u.total_input_tokens,
    totalOutputTokens: u.total_output_tokens,
    calls: u.calls,
  }));

// ---------- summarize (POST /snapshots/{id}/summarize) ----------

// Must match InspectionSummary in Backend/app/llm/schemas.py
const InspectionSummarySchema = z
  .object({
    page_summary: z.string(),
    elements: z.array(z.object({ element_id: z.number(), purpose: z.string() })),
    suggested_actions: z.array(
      z.object({ action: z.string(), element_ids: z.array(z.number()), reason: z.string() })
    ),
    questions_for_tester: z.array(z.string()),
  })
  .transform((s) => ({
    pageSummary: s.page_summary,
    elementNotes: s.elements.map((e) => ({ elementId: e.element_id, purpose: e.purpose })),
    suggestedActions: s.suggested_actions.map((a) => ({
      action: a.action,
      elementIds: a.element_ids,
      reason: a.reason,
    })),
    questions: s.questions_for_tester,
  }));

export const SummarizeResponseSchema = z
  .object({ summary: InspectionSummarySchema, warnings: z.array(z.string()), call: LLMCallSchema })
  .transform((r) => ({ summary: r.summary, warnings: r.warnings, call: r.call }));

export type ModelInfo = z.infer<typeof ModelInfoSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
export type LLMCall = z.infer<typeof LLMCallSchema>;
export type LLMCallDetail = z.infer<typeof LLMCallDetailSchema>;
export type LLMUsage = z.infer<typeof LLMUsageSchema>;
export type InspectionSummary = z.infer<typeof InspectionSummarySchema>;
export type SummarizeResponse = z.infer<typeof SummarizeResponseSchema>;
