"use client";

import MetricCard from "@/components/dashboard/metric-card";
import WebsiteUrlForm from "@/components/dashboard/website-url-form";
import { useWebsites } from "@/hooks/api/use-websites";

export default function DashboardPage() {
  const websitesQuery = useWebsites();
  const websiteCount = websitesQuery.data ? String(websitesQuery.data.length) : "…";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-hero">Dashboard</h1>

      <WebsiteUrlForm />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Websites" value={websiteCount} />
        {/* Runs are not built yet. Pass rate = passed / (passed + failed), "No results" when both are 0 */}
        <MetricCard title="Test pass rate" value="No results" note="Run tests to see a pass rate." />
      </div>
    </div>
  );
}
