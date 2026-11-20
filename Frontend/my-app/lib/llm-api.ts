import { apiRequest, authHeaders } from "./api-client";
import { LLMCallDetailSchema, LLMUsageSchema, ModelsResponseSchema, SummarizeResponseSchema } from "./llm";

export async function listModels(accessToken: string, signal?: AbortSignal) {
  const body = await apiRequest("/llm/models", { headers: authHeaders(accessToken), signal });
  const parsed = ModelsResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid model list.");
  return parsed.data;
}

// Runs the local model. The first call can be slow because Ollama loads the model into the GPU.
export async function summarizeSnapshot(accessToken: string, snapshotId: number, model: string | null) {
  const body = await apiRequest("/snapshots/" + snapshotId + "/summarize", {
    method: "POST",
    headers: authHeaders(accessToken),
    // null = the backend uses its default model (OLLAMA_MODEL)
    body: JSON.stringify({ model: model || null }),
  });
  const parsed = SummarizeResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid model summary.");
  return parsed.data;
}

export async function getLlmUsage(accessToken: string, snapshotId: number, signal?: AbortSignal) {
  const body = await apiRequest("/snapshots/" + snapshotId + "/llm-calls", {
    headers: authHeaders(accessToken),
    signal,
  });
  const parsed = LLMUsageSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned invalid usage data.");
  return parsed.data;
}

export async function getLlmCall(accessToken: string, callId: number, signal?: AbortSignal) {
  const body = await apiRequest("/llm-calls/" + callId, { headers: authHeaders(accessToken), signal });
  const parsed = LLMCallDetailSchema.safeParse(body);
  if (!parsed.success) throw new Error("The server returned an invalid model call.");
  return parsed.data;
}
