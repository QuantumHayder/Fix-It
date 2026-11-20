import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { ApiError } from "../lib/api-client";
import { formatDuration, formatTokens, shortDigest } from "../lib/formatters";
import { getLlmCall, getLlmUsage, listModels, summarizeSnapshot } from "../lib/llm-api";

const API_URL = "http://localhost:8000";
const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

// Shape returned by FastAPI (LLMCallResponse)
const apiCall = {
  id: 5,
  snapshot_id: 7,
  model_name: "qwen2.5-coder:7b",
  model_version: "sha256:2b0496514337a3d5901f1d253d01726c890b721e891335a56d6e08cedf3e2cb0",
  purpose: "inspection",
  timestamp: "2026-11-20T10:00:00.000+00:00",
  duration_ms: 12345,
  input_tokens: 1800,
  output_tokens: 240,
  token_count_source: "runtime",
  status: "success",
  error_message: null,
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

test("listModels converts the Ollama model list", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, API_URL + "/llm/models");
    return Response.json({
      default_model: "qwen2.5-coder:7b",
      models: [{ name: "qwen2.5-coder:7b", digest: "abc", parameter_size: "7.6B", quantization: "Q4_K_M", size_bytes: 4683087332 }],
    });
  };
  const result = await listModels("test-token");
  assert.equal(result.defaultModel, "qwen2.5-coder:7b");
  assert.equal(result.models[0].parameterSize, "7.6B");
});

test("Ollama not running keeps the backend's 503 message", async () => {
  globalThis.fetch = async () =>
    Response.json({ detail: "Ollama is not running. Start it with 'ollama serve'." }, { status: 503 });
  await assert.rejects(listModels("test-token"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 503);
    assert.match(error.message, /ollama serve/);
    return true;
  });
});

test("summarizeSnapshot posts the chosen model and converts the answer", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, API_URL + "/snapshots/7/summarize");
    assert.equal(options?.method, "POST");
    assert.deepEqual(JSON.parse(String(options?.body)), { model: "qwen2.5-coder:1.5b" });
    return Response.json({
      summary: {
        page_summary: "A login page.",
        elements: [{ element_id: 11, purpose: "Submits the login form" }],
        suggested_actions: [{ action: "Click Log in with empty fields", element_ids: [11], reason: "Check validation" }],
        questions_for_tester: ["What message should a wrong password show?"],
      },
      warnings: ["Model described element 99, which is not in the selection; removed."],
      call: apiCall,
    });
  };
  const result = await summarizeSnapshot("test-token", 7, "qwen2.5-coder:1.5b");
  assert.equal(result.summary.pageSummary, "A login page.");
  assert.deepEqual(result.summary.elementNotes, [{ elementId: 11, purpose: "Submits the login form" }]);
  assert.deepEqual(result.summary.suggestedActions[0].elementIds, [11]);
  assert.equal(result.summary.questions.length, 1);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.call.durationMs, 12345);
  assert.equal(result.call.tokenCountSource, "runtime");
});

test("summarizeSnapshot sends null for the default model", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(String(options?.body)), { model: null });
    return Response.json({ detail: "Choose the elements, test type and goal first" }, { status: 400 });
  };
  await assert.rejects(summarizeSnapshot("test-token", 7, null), /Choose the elements/);
});

test("getLlmUsage returns totals, the page average and each call", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, API_URL + "/snapshots/7/llm-calls");
    return Response.json({
      call_count: 2,
      successful_calls: 1,
      average_duration_ms: 12345,
      total_input_tokens: 2250,
      total_output_tokens: 240,
      calls: [
        apiCall,
        { ...apiCall, id: 6, status: "error", output_tokens: null, input_tokens: 450, token_count_source: "estimated", error_message: "ReadTimeout" },
      ],
    });
  };
  const usage = await getLlmUsage("test-token", 7);
  assert.equal(usage.averageDurationMs, 12345);
  assert.equal(usage.totalInputTokens, 2250);
  assert.equal(usage.calls[1].status, "error");
  assert.equal(usage.calls[1].outputTokens, null);
  assert.equal(usage.calls[1].tokenCountSource, "estimated");
});

test("getLlmUsage allows no average when there are no successful calls", async () => {
  globalThis.fetch = async () =>
    Response.json({ call_count: 0, successful_calls: 0, average_duration_ms: null, total_input_tokens: 0, total_output_tokens: 0, calls: [] });
  const usage = await getLlmUsage("test-token", 7);
  assert.equal(usage.averageDurationMs, null);
});

test("getLlmCall includes the prompt and answer", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, API_URL + "/llm-calls/5");
    return Response.json({ ...apiCall, input: "[prompt]", output: "{\"page_summary\": \"...\"}" });
  };
  const call = await getLlmCall("test-token", 5);
  assert.equal(call.input, "[prompt]");
  assert.equal(call.modelName, "qwen2.5-coder:7b");
});

test("formatters show durations, tokens and short digests", () => {
  assert.equal(formatDuration(850), "850 ms");
  assert.equal(formatDuration(12345), "12.3 s");
  assert.equal(formatDuration(null), "–");
  assert.equal(formatTokens(12345), "12,345");
  assert.equal(formatTokens(null), "–");
  assert.equal(shortDigest(apiCall.model_version), "2b0496514337");
});
