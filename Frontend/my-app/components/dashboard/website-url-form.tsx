"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCreateWebsite } from "@/hooks/api/use-websites";

export default function WebsiteUrlForm() {
  const router = useRouter();
  const createMutation = useCreateWebsite();
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createMutation.isPending) return;

    try {
      const website = await createMutation.mutateAsync({ url, displayName });
      setUrl("");
      setDisplayName("");
      router.push("/websites/" + website.id);
    } catch {
      // the error is shown below the form
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-hero/10 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-hero">Add a website</h2>
      <p className="mt-1 text-sm text-hero-muted">Enter the URL of the site you want to test.</p>

      <fieldset disabled={createMutation.isPending} className="mt-4 flex flex-col gap-3 sm:flex-row disabled:opacity-70">
        <label htmlFor="website-url" className="sr-only">Website URL</label>
        <input
          id="website-url"
          type="text"
          inputMode="url"
          placeholder="http://localhost:5000"
          required
          value={url}
          onChange={(e) => { setUrl(e.target.value); createMutation.reset(); }}
          className="flex-1 rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
        />
        <label htmlFor="website-name" className="sr-only">Name (optional)</label>
        <input
          id="website-name"
          type="text"
          placeholder="Name (optional)"
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); createMutation.reset(); }}
          className="rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue sm:w-48"
        />
        <button
          type="submit"
          aria-label="Add website"
          className="site-link rounded-full bg-hero px-6 py-3 text-lg font-semibold text-site-surface transition-colors hover:bg-hero-blue disabled:cursor-wait"
        >
          {createMutation.isPending ? "…" : "+"}
        </button>
      </fieldset>

      {createMutation.error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {createMutation.error.message}
        </p>
      )}
    </form>
  );
}
