import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-hero/10 bg-site-surface/95 text-hero">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:px-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="site-link rounded-md text-lg font-semibold tracking-tight">
            Fix It<span className="text-hero-orange">.</span>
          </Link>
          <p className="mt-2 text-sm text-hero-muted">Test your website. Understand the results. Fix what matters.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-hero-muted">
          <Link href="/" className="site-link rounded-md hover:text-hero-blue">Home</Link>
          <Link href="/auth/login" className="site-link rounded-md hover:text-hero-blue">Sign in</Link>
          <Link href="/auth/register" className="site-link rounded-md hover:text-hero-blue">Create an account</Link>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-6 text-xs text-hero-muted sm:px-10">
        &copy; {2026} Fix It. All rights reserved.
      </div>
    </footer>
  );
}
