"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUserInfoStore } from "@/stores/user-info-store";

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
  return <>{children}</>;
}