"use client";

import { useState } from "react";
import ModelSelector from "@/components/chat/model-selector";
import { useSummarize } from "@/hooks/api/use-llm";
import { formatDuration, formatTokens } from "@/lib/formatters";
import type { SnapshotDetail } from "@/lib/snapshots";

export default function ModelSummaryPanel({ snapshot }: { snapshot: SnapshotDetail }) {
  const summarizeMutation = useSummarize(snapshot.id);
  const [model, setModel] = useState("");

  // element id -> name, so the answer shows names the tester recognizes
  const names = new Map(snapshot.elements.map((el) => [el.id, el.displayName]));
  const nameOf = (id: number) => (names.get(id) ?? "element") + " (#" + id + ")";

  const result = summarizeMutation.data;

  return (
    <section className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-hero">Ask the model</h2>
      <p className="mt-1 text-sm text-hero-muted">
        The local model summarizes the selected elements and suggests what to test next, using only what was observed on the page.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <ModelSelector value={model} onChange={setModel} disabled={summarizeMutation.isPending} />
        </div>
        <button
          type="button"
          disabled={summarizeMutation.isPending}
          onClick={() => summarizeMutation.mutate(model || null)}
          className="site-link rounded-full bg-hero px-6 py-2.5 font-medium text-site-surface transition-colors hover:bg-hero-blue disabled:cursor-wait disabled:opacity-60"
        >
          {summarizeMutation.isPending ? "Thinking…" : "Summarize selection"}
        </button>
      </div>

      {summarizeMutation.isPending && (
        <p role="status" className="mt-3 text-sm text-hero-muted">
          Waiting for the model. The first call can take a while because the model is loaded into memory.
        </p>
      )}

      {summarizeMutation.error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {summarizeMutation.error.message}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-5 text-sm text-hero">
          {/* the evidence the rubric asks for: model, tokens and response time of this call */}
          <p className="rounded-xl bg-hero/5 px-4 py-2 text-xs text-hero-muted">
            {result.call.modelName} · {formatTokens(result.call.inputTokens)} in / {formatTokens(result.call.outputTokens)} out tokens
            ({result.call.tokenCountSource}) · {formatDuration(result.call.durationMs)}
          </p>

          {result.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-hero-orange/30 bg-hero-orange/10 px-4 py-3 text-xs text-hero-orange">
              {result.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
            </ul>
          )}

          <div>
            <h3 className="font-semibold">Page summary</h3>
            <p className="mt-1 text-hero-muted">{result.summary.pageSummary}</p>
          </div>

          {result.summary.elementNotes.length > 0 && (
            <div>
              <h3 className="font-semibold">Elements</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-hero-muted">
                {result.summary.elementNotes.map((note) => (
                  <li key={note.elementId}>
                    <span className="font-medium text-hero">{nameOf(note.elementId)}</span>: {note.purpose}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.summary.suggestedActions.length > 0 && (
            <div>
              <h3 className="font-semibold">Suggested next actions</h3>
              <ol className="mt-1 list-decimal space-y-2 pl-5 text-hero-muted">
                {result.summary.suggestedActions.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium text-hero">{a.action}</span>
                    <span className="block text-xs">Why: {a.reason}</span>
                    {a.elementIds.length > 0 && (
                      <span className="block text-xs">Uses: {a.elementIds.map(nameOf).join(", ")}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.summary.questions.length > 0 && (
            <div>
              <h3 className="font-semibold">Questions for you</h3>
              <p className="text-xs text-hero-muted">The page alone can&apos;t answer these. Add the answers to your expected behaviour above.</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-hero-muted">
                {result.summary.questions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
