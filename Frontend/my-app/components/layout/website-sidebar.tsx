"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWebsites } from "@/hooks/api/use-websites";

export default function WebsiteSidebar() {
  const pathname = usePathname();
  const websitesQuery = useWebsites();

  return (
    <aside className="w-full shrink-0 border-b border-hero/10 bg-site-surface p-4 md:w-64 md:border-r md:border-b-0">
      <Link
        href="/dashboard"
        className={
          "site-link block rounded-lg px-3 py-2 text-sm font-medium " +
          (pathname === "/dashboard" ? "bg-hero text-site-surface" : "text-hero hover:bg-hero/5")
        }
      >
        Dashboard
      </Link>

      <h2 className="mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-hero-muted">Websites</h2>

      {websitesQuery.isPending && <p className="mt-2 px-3 text-sm text-hero-muted">Loading…</p>}

      {websitesQuery.error && (
        <p role="alert" className="mt-2 px-3 text-sm text-red-700">{websitesQuery.error.message}</p>
      )}

      {websitesQuery.data?.length === 0 && (
        <p className="mt-2 px-3 text-sm text-hero-muted">No websites yet.</p>
      )}

      <ul className="mt-2 space-y-1">
        {websitesQuery.data?.map((website) => {
          const href = "/websites/" + website.id;
          // also highlight while inside the website's sub pages (snapshots, runs)
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={website.id}>
              <Link
                href={href}
                title={website.url}
                className={
                  "site-link block truncate rounded-lg px-3 py-2 text-sm " +
                  (isActive ? "bg-hero text-site-surface" : "text-hero hover:bg-hero/5")
                }
              >
                {website.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
