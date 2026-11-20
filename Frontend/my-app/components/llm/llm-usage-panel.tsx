"use client";

import { useState } from "react";
import MetricCard from "@/components/dashboard/metric-card";
import { useLlmCall, useLlmUsage } from "@/hooks/api/use-llm";
import { formatDateTime, formatDuration, formatTokens, shortDigest } from "@/lib/formatters";
import type { LLMCall } from "@/lib/llm";

// Per-call tokens and response time, plus the page-level average (rubric: versioning and visibility)
export default function LlmUsagePanel({ snapshotId }: { snapshotId: number }) {
  const usageQuery = useLlmUsage(snapshotId);

  if (usageQuery.isPending) return <p className="text-sm text-hero-muted">Loading model usage…</p>;
  if (usageQuery.error) return <p role="alert" className="text-sm text-red-700">{usageQuery.error.message}</p>;

  const usage = usageQuery.data;

  return (
    <section className="space-y-4 rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-hero">Model usage for this page</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Model calls"
          value={String(usage.callCount)}
          note={usage.successfulCalls + " successful"}
        />
        <MetricCard
          title="Average response time"
          value={formatDuration(usage.averageDurationMs)}
          note="Successful calls only"
        />
        <MetricCard
          title="Total tokens"
          value={formatTokens(usage.totalInputTokens + usage.totalOutputTokens)}
          note={formatTokens(usage.totalInputTokens) + " in / " + formatTokens(usage.totalOutputTokens) + " out"}
        />
      </div>

      {usage.calls.length === 0 ? (
        <p className="text-sm text-hero-muted">No model calls yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-hero-muted">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Model</th>
                <th className="py-2 pr-3">Purpose</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Input tokens</th>
                <th className="py-2 pr-3 text-right">Output tokens</th>
                <th className="py-2 text-right">Response time</th>
              </tr>
            </thead>
            {usage.calls.map((call) => <CallRows key={call.id} call={call} />)}
          </table>
        </div>
      )}
    </section>
  );
}

// One table row for the call, plus an optional row with the prompt and answer
function CallRows({ call }: { call: LLMCall }) {
  const [open, setOpen] = useState(false);
  const tokenNote = call.tokenCountSource === "runtime" ? "" : " (" + call.tokenCountSource + ")";

  return (
    <tbody className="border-t border-hero/10 text-hero">
      <tr>
        <td className="py-2 pr-3">{call.id}</td>
        <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(call.timestamp)}</td>
        <td className="py-2 pr-3">
          {call.modelName}
          <span className="block font-mono text-xs text-hero-muted">{shortDigest(call.modelVersion)}</span>
        </td>
        <td className="py-2 pr-3">{call.purpose}</td>
        <td className="py-2 pr-3">
          <span className={call.status === "success" ? "text-green-700" : "text-red-700"}>{call.status}</span>
        </td>
        <td className="py-2 pr-3 text-right">{formatTokens(call.inputTokens)}{tokenNote}</td>
        <td className="py-2 pr-3 text-right">{formatTokens(call.outputTokens)}{tokenNote}</td>
        <td className="py-2 text-right">{formatDuration(call.durationMs)}</td>
      </tr>
      <tr>
        <td colSpan={8} className="pb-3">
          {call.errorMessage && <p className="text-xs text-red-700">{call.errorMessage}</p>}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="site-link rounded text-xs text-hero-blue underline underline-offset-4"
          >
            {open ? "Hide prompt & answer" : "Show prompt & answer"}
          </button>
          {open && <CallDetails callId={call.id} />}
        </td>
      </tr>
    </tbody>
  );
}

function CallDetails({ callId }: { callId: number }) {
  const callQuery = useLlmCall(callId);

  if (callQuery.isPending) return <p className="mt-2 text-xs text-hero-muted">Loading…</p>;
  if (callQuery.error) return <p className="mt-2 text-xs text-red-700">{callQuery.error.message}</p>;

  return (
    <div className="mt-2 grid gap-3 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold text-hero-muted">Prompt sent</p>
        <pre className="mt-1 max-h-72 overflow-auto rounded-xl bg-hero/5 p-3 text-xs whitespace-pre-wrap">{callQuery.data.input}</pre>
      </div>
      <div>
        <p className="text-xs font-semibold text-hero-muted">Model answer</p>
        <pre className="mt-1 max-h-72 overflow-auto rounded-xl bg-hero/5 p-3 text-xs whitespace-pre-wrap">
          {callQuery.data.output ?? "(no answer)"}
        </pre>
      </div>
    </div>
  );
}
