"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import ElementSelector from "@/components/inspection/element-selector";
import TestOptionsForm, { type TestOptions } from "@/components/inspection/test-options-form";
import LlmUsagePanel from "@/components/llm/llm-usage-panel";
import ModelSummaryPanel from "@/components/llm/model-summary-panel";
import { useSetScope, useSnapshot } from "@/hooks/api/use-snapshots";
import type { SnapshotDetail, TestType } from "@/lib/snapshots";

// Loads the snapshot from the URL, then shows the scope editor.
export default function InspectionWorkspace() {
  const params = useParams<{ websiteId: string; snapshotId: string }>();
  const websiteId = Number(params.websiteId);
  const snapshotId = Number(params.snapshotId);
  const snapshotQuery = useSnapshot(snapshotId);

  if (!Number.isInteger(snapshotId) || snapshotId <= 0) {
    return <p role="alert" className="text-red-700">This inspection link is not valid.</p>;
  }
  if (snapshotQuery.isPending) {
    return <p className="text-sm text-hero-muted">Loading inspection…</p>;
  }
  if (snapshotQuery.error) {
    return <p role="alert" className="text-red-700">{snapshotQuery.error.message}</p>;
  }
  // the snapshot must belong to the website in the URL
  if (snapshotQuery.data.websiteId !== websiteId) {
    return <p role="alert" className="text-red-700">Snapshot not found for this website.</p>;
  }

  // key: start with fresh form state if we move to another snapshot
  return <ScopeEditor key={snapshotQuery.data.id} snapshot={snapshotQuery.data} />;
}

function ScopeEditor({ snapshot }: { snapshot: SnapshotDetail }) {
  const scopeMutation = useSetScope(snapshot.id);

  // start from the scope saved earlier, if there is one
  const [selectedIds, setSelectedIds] = useState<number[]>(snapshot.selectedElementIds);
  const [options, setOptions] = useState<TestOptions>({
    testType: (snapshot.testType as TestType | null) ?? "",
    testGoal: snapshot.testGoal ?? "",
    requirementsText: snapshot.requirements.map((r) => r.text).join("\n"),
  });
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scopeMutation.isPending) return;
    setSaved(false);

    try {
      await scopeMutation.mutateAsync({
        testType: options.testType as TestType,
        testGoal: options.testGoal,
        // all elements ticked = "select all", so the backend stores every element
        selectAll: selectedIds.length === snapshot.elements.length && selectedIds.length > 0,
        elementIds: selectedIds,
        requirements: options.requirementsText.split("\n"),
      });
      setSaved(true);
    } catch {
      // the error is shown above the button
    }
  }

  // any change after saving means the user has to save again
  function changeSelection(ids: number[]) { setSelectedIds(ids); setSaved(false); scopeMutation.reset(); }
  function changeOptions(next: TestOptions) { setOptions(next); setSaved(false); scopeMutation.reset(); }

  return (
    <div className="space-y-6">
      <div>
        <Link href={"/websites/" + snapshot.websiteId} className="site-link rounded text-sm text-hero-blue underline underline-offset-4">
          ← Back to website
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-hero">Inspection #{snapshot.id}</h1>
        <p className="mt-1 break-all text-sm text-hero-muted">
          {snapshot.pageUrl} · {new Date(snapshot.capturedAt).toLocaleString()} · {snapshot.elementCount} elements
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <ElementSelector
          elements={snapshot.elements}
          selectedIds={selectedIds}
          onChange={changeSelection}
          disabled={scopeMutation.isPending}
        />

        <div className="space-y-4 lg:sticky lg:top-6">
          <TestOptionsForm options={options} onChange={changeOptions} disabled={scopeMutation.isPending} />

          {scopeMutation.error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {scopeMutation.error.message}
            </p>
          )}

          {saved && (
            <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Scope saved: {snapshot.selectedElementIds.length} elements, {snapshot.testType} test.
            </p>
          )}

          <button
            type="submit"
            disabled={scopeMutation.isPending || selectedIds.length === 0}
            className="site-link w-full rounded-full bg-hero px-5 py-3 font-medium text-site-surface transition-colors hover:bg-hero-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scopeMutation.isPending ? "Saving…" : "Save scope"}
          </button>

          {snapshot.hasScope && (
            <Link
              href={`/websites/${snapshot.websiteId}/snapshots/${snapshot.id}/test-cases`}
              className="site-link block rounded-full border border-hero/20 px-5 py-3 text-center font-medium text-hero hover:bg-hero/5"
            >
              Next: test cases →
            </Link>
          )}
        </div>
      </form>

      {/* The model works on the saved scope, so it is only offered after saving */}
      {snapshot.hasScope ? (
        <ModelSummaryPanel snapshot={snapshot} />
      ) : (
        <p className="rounded-3xl border border-dashed border-hero/20 p-6 text-sm text-hero-muted">
          Save the scope to ask the model for a summary of the selected elements.
        </p>
      )}

      <LlmUsagePanel snapshotId={snapshot.id} />
    </div>
  );
}
