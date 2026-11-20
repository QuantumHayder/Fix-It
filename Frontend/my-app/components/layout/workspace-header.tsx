"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useUserInfoStore } from "@/stores/user-info-store";

export default function WorkspaceHeader() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userInfo = useUserInfoStore((s) => s.userInfo);
  const clearSession = useUserInfoStore((s) => s.clearSession);

  function handleSignOut() {
    clearSession();
    queryClient.clear(); // forget the old user's websites
    router.replace("/auth/login");
  }

  return (
    <header className="border-b border-hero/10 bg-site-surface text-hero">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <Link href="/dashboard" className="site-link rounded-lg text-xl font-semibold tracking-tight">
          Fix It<span className="text-hero-orange">.</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {userInfo && <span className="hidden text-hero-muted sm:inline">{userInfo.fullName}</span>}
          <button
            type="button"
            onClick={handleSignOut}
            className="site-link rounded-full border border-hero/20 px-4 py-2 font-medium hover:bg-hero/5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
