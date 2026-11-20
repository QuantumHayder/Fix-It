"use client";

import Link from "next/link";
import { useSnapshots } from "@/hooks/api/use-snapshots";

export default function SnapshotList({ websiteId }: { websiteId: number }) {
  const snapshotsQuery = useSnapshots(websiteId);

  return (
    <section className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-hero">Inspections</h2>

      {snapshotsQuery.isPending && <p className="mt-3 text-sm text-hero-muted">Loading…</p>}

      {snapshotsQuery.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">{snapshotsQuery.error.message}</p>
      )}

      {snapshotsQuery.data?.length === 0 && (
        <p className="mt-3 text-sm text-hero-muted">No inspections yet. Inspect the page above to start.</p>
      )}

      <ul className="mt-3 divide-y divide-hero/10">
        {snapshotsQuery.data?.map((snapshot) => (
          <li key={snapshot.id}>
            <Link
              href={`/websites/${websiteId}/snapshots/${snapshot.id}/inspect`}
              className="site-link flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 hover:bg-hero/5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-hero">{snapshot.pageUrl}</p>
                <p className="text-xs text-hero-muted">
                  #{snapshot.id} · {new Date(snapshot.capturedAt).toLocaleString()} · {snapshot.elementCount} elements
                  {snapshot.previousSnapshotId && " · rescan of #" + snapshot.previousSnapshotId}
                </p>
              </div>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-medium " +
                  (snapshot.hasScope ? "bg-green-100 text-green-800" : "bg-hero-orange/15 text-hero-orange")
                }
              >
                {snapshot.hasScope ? snapshot.testType + " scope saved" : "Choose scope"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
