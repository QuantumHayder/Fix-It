import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-site-surface font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
