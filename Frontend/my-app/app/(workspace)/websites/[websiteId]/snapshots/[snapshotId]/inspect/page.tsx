import { Suspense } from "react";
import InspectionWorkspace from "@/components/inspection/inspection-workspace";

// With cacheComponents on, useParams() needs a Suspense boundary on dynamic routes.
export default function InspectPage() {
  return (
    <Suspense fallback={<p className="text-sm text-hero-muted">Loading inspection…</p>}>
      <InspectionWorkspace />
    </Suspense>
  );
}
