"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLogin } from "@/hooks/api/use-login";

export default function LoginForm() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Stops the browser’s default form submission, which would reload the page
    if (loginMutation.isPending) return; // Guards against double submits, such as an Enter key press

    try {
      await loginMutation.mutateAsync({identifier: identifier.trim(), password });
      setPassword("");
      router.replace("/dashboard");
    } catch {
      // React Query exposes the request error below the fields.
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-hero/10 bg-site-surface p-6 shadow-xl shadow-hero/5 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight text-hero">Welcome back</h1>
      <p className="mt-2 text-sm text-hero-muted">Sign in to continue testing with Fix It.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-busy={loginMutation.isPending}>
        <fieldset disabled={loginMutation.isPending} className="space-y-5 disabled:opacity-70">
          <div>
            <label htmlFor="email or username" className="block text-sm font-medium text-hero">Identifier</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => { setIdentifier(event.target.value); loginMutation.reset(); }}
              className="mt-2 w-full rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-hero">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => { setPassword(event.target.value); loginMutation.reset(); }}
              className="mt-2 w-full rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue"
            />
          </div>
        </fieldset>

        {loginMutation.error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loginMutation.error.message}
          </p>
        )}

        <button type="submit" disabled={loginMutation.isPending} className="site-link w-full rounded-full bg-hero px-5 py-3 font-medium text-site-surface transition-colors hover:bg-hero-blue disabled:cursor-wait disabled:opacity-60">
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-hero-muted">
        New to Fix It?{" "}
        <Link href="/auth/register" className="site-link rounded-sm font-medium text-hero-blue underline underline-offset-4">Create an account</Link>
      </p>
    </div>
  );
}
