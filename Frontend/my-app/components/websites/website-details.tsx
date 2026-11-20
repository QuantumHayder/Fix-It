"use client";

import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useUpdateWebsite, useWebsite } from "@/hooks/api/use-websites";
import NewInspectionForm from "@/components/inspection/new-inspection-form";
import SnapshotList from "@/components/websites/snapshot-list";

export default function WebsiteDetails() {
  const params = useParams<{ websiteId: string }>();
  const websiteId = Number(params.websiteId);

  const websiteQuery = useWebsite(websiteId);
  const updateMutation = useUpdateWebsite(websiteId);

  // null = not editing
  const [newName, setNewName] = useState<string | null>(null);

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newName === null || updateMutation.isPending) return;
    try {
      await updateMutation.mutateAsync({ displayName: newName });
      setNewName(null);
    } catch {
      // the error is shown below the form
    }
  }

  if (!Number.isInteger(websiteId) || websiteId <= 0) {
    return <p role="alert" className="text-red-700">This website link is not valid.</p>;
  }
  if (websiteQuery.isPending) {
    return <p className="text-sm text-hero-muted">Loading website…</p>;
  }
  if (websiteQuery.error) {
    return <p role="alert" className="text-red-700">{websiteQuery.error.message}</p>;
  }

  const website = websiteQuery.data;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
        {newName === null ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-hero">{website.label}</h1>
              <a href={website.url} target="_blank" rel="noreferrer" className="site-link mt-1 block text-sm text-hero-blue underline underline-offset-4">
                {website.url}
              </a>
              <p className="mt-2 text-xs text-hero-muted">Added {new Date(website.createdAt).toLocaleString()}</p>
            </div>
            <button
              type="button"
              onClick={() => setNewName(website.displayName ?? "")}
              className="site-link rounded-full border border-hero/20 px-4 py-2 text-sm font-medium text-hero hover:bg-hero/5"
            >
              Rename
            </button>
          </div>
        ) : (
          <form onSubmit={handleRename} className="space-y-3">
            <label htmlFor="display-name" className="block text-sm font-medium text-hero">Website name</label>
            <input
              id="display-name"
              type="text"
              autoFocus
              placeholder="Leave empty to show the URL"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); updateMutation.reset(); }}
              className="w-full rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="site-link rounded-full bg-hero px-5 py-2 text-sm font-medium text-site-surface hover:bg-hero-blue disabled:cursor-wait disabled:opacity-60"
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setNewName(null); updateMutation.reset(); }}
                className="site-link rounded-full border border-hero/20 px-5 py-2 text-sm font-medium text-hero hover:bg-hero/5"
              >
                Cancel
              </button>
            </div>
            {updateMutation.error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {updateMutation.error.message}
              </p>
            )}
          </form>
        )}
      </div>

      <NewInspectionForm website={website} />
      <SnapshotList websiteId={website.id} />
    </div>
  );
}
