"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUserInfoStore } from "@/stores/user-info-store";
import WorkspaceHeader from "@/components/layout/workspace-header";
import WebsiteSidebar from "@/components/layout/website-sidebar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useUserInfoStore((s) => s.hasHydrated);
  const isSignedIn = useUserInfoStore((s) => s.isSignedIn);

  useEffect(() => {
    if (hasHydrated && !isSignedIn) router.replace("/auth/login");
  }, [hasHydrated, isSignedIn, router]);

  if (!hasHydrated || !isSignedIn) {
    return <p className="p-6 text-sm text-hero-muted">Loading…</p>;
  }

  return (
    <div className="flex min-h-svh flex-col bg-site-surface font-sans">
      <WorkspaceHeader />
      <div className="flex flex-1 flex-col md:flex-row">
        {/* usePathname() in the sidebar needs Suspense on dynamic routes */}
        <Suspense fallback={null}>
          <WebsiteSidebar />
        </Suspense>
        <main id="main-content" tabIndex={-1} className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
