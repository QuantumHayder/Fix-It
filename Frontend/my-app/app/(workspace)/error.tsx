"use client";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="p-6">
      <h2 className="text-lg font-semibold text-hero">Something went wrong</h2>
      <p className="mt-2 text-sm text-hero-muted">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-full bg-hero px-5 py-2 text-sm font-medium text-site-surface hover:bg-hero-blue"
      >
        Try again
      </button>
    </div>
  );
}