import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-hero/10 bg-site-surface/95 text-hero">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-site-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-20"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <Link href="/" aria-label="Fix It home" className="site-link flex items-center gap-3 rounded-lg">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-hero text-site-surface">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m8 6-5 6 5 6M16 6l5 6-5 6" />
              <path d="m9 12 2 2 4-4" className="stroke-[#ffbd75]" />
            </svg>
          </span>
          <span className="text-xl font-semibold tracking-tight">Fix It<span className="text-hero-orange">.</span></span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-4 text-sm font-medium sm:gap-6">
          <Link href="/auth/login" className="site-link rounded-md py-2 text-hero-muted hover:text-hero-blue">
            Sign in
          </Link>
          <Link href="/auth/register" className="site-link rounded-full bg-hero px-5 py-2.5 text-hero-orange transition-colors hover:bg-hero-blue">
            Get started <span aria-hidden="true" className="ml-1">&rarr;</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
