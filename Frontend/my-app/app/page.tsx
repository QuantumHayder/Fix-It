import Image from "next/image";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function Home() {
  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-hero-surface font-sans">
      
      <Image
        src="/bg2.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="pointer-events-none object-cover"
      />

      {/* A light wash softens the colors while keeping the artwork visible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-hero-surface/10 to-hero-surface/25"
      />
      
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center text-hero">
        
      </main>
      <SiteFooter />
    </div>
  );
}
