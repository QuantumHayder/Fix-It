export default function MetricCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-hero-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-hero">{value}</p>
      {note && <p className="mt-1 text-xs text-hero-muted">{note}</p>}
    </div>
  );
}
