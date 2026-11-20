"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useInspectWebsite } from "@/hooks/api/use-snapshots";
import type { Website } from "@/lib/websites";

export default function NewInspectionForm({ website }: { website: Website }) {
  const router = useRouter();
  const inspectMutation = useInspectWebsite(website.id);
  const [pageUrl, setPageUrl] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inspectMutation.isPending) return;

    try {
      const snapshot = await inspectMutation.mutateAsync({ pageUrl });
      router.push(`/websites/${website.id}/snapshots/${snapshot.id}/inspect`);
    } catch {
      // the error is shown below the form
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-hero">New inspection</h2>
      <p className="mt-1 text-sm text-hero-muted">
        A browser window opens the page and collects its interactive elements (buttons, links, inputs…).
      </p>

      <fieldset disabled={inspectMutation.isPending} className="mt-4 flex flex-col gap-3 sm:flex-row disabled:opacity-70">
        <label htmlFor="page-url" className="sr-only">Page URL (optional)</label>
        <input
          id="page-url"
          type="text"
          inputMode="url"
          placeholder={website.url + "  (or another page, e.g. " + website.url + "/login)"}
          value={pageUrl}
          onChange={(e) => { setPageUrl(e.target.value); inspectMutation.reset(); }}
          className="flex-1 rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
        />
        <button
          type="submit"
          className="site-link rounded-full bg-hero px-6 py-3 font-medium text-site-surface transition-colors hover:bg-hero-blue disabled:cursor-wait"
        >
          {inspectMutation.isPending ? "Inspecting…" : "Inspect page"}
        </button>
      </fieldset>

      {inspectMutation.isPending && (
        <p role="status" className="mt-3 text-sm text-hero-muted">
          Inspecting the page in a visible browser. This can take up to a minute, please keep this tab open.
        </p>
      )}

      {inspectMutation.error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {inspectMutation.error.message}
        </p>
      )}
    </form>
  );
}
