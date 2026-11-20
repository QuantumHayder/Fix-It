import { Suspense } from "react";
import WebsiteDetails from "@/components/websites/website-details";

// With cacheComponents on, useParams() needs a Suspense boundary on dynamic routes.
export default function WebsitePage() {
  return (
    <Suspense fallback={<p className="text-sm text-hero-muted">Loading website…</p>}>
      <WebsiteDetails />
    </Suspense>
  );
}
