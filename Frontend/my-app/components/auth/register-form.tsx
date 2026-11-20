"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useRegister } from "@/hooks/api/use-register";
import { RegisterRequestSchema } from "@/lib/auth";

const inputClass =
  "mt-2 w-full rounded-xl border border-hero/20 bg-white px-4 py-3 text-hero outline-offset-2 focus-visible:outline-2 focus-visible:outline-hero-blue";

const FIELDS = [
  { name: "firstName", label: "First name", type: "text", autoComplete: "given-name" },
  { name: "lastName", label: "Last name", type: "text", autoComplete: "family-name" },
  { name: "username", label: "Username", type: "text", autoComplete: "username" },
  { name: "email", label: "Email address", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

export default function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const [values, setValues] = useState<Record<FieldName, string>>({
    firstName: "", lastName: "", username: "", email: "", password: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  function update(name: FieldName, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    setValidationError(null);
    registerMutation.reset();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registerMutation.isPending) return;

    const parsed = RegisterRequestSchema.safeParse(values);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Check the form fields.");
      return;
    }

    try {
      await registerMutation.mutateAsync(parsed.data);
      router.replace("/dashboard");
    } catch {
      // the error is rendered below from registerMutation.error
    }
  }

  const errorMessage = validationError ?? registerMutation.error?.message;

  return (
    <div className="w-full max-w-md rounded-3xl border border-hero/10 bg-site-surface p-6 shadow-xl shadow-hero/5 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight text-hero">Create your account</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-busy={registerMutation.isPending}>
        <fieldset disabled={registerMutation.isPending} className="space-y-5 disabled:opacity-70">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name} className="block text-sm font-medium text-hero">{f.label}</label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                required
                value={values[f.name]}
                onChange={(e) => update(f.name, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </fieldset>

        {errorMessage && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="site-link w-full rounded-full bg-hero px-5 py-3 font-medium text-site-surface transition-colors hover:bg-hero-blue disabled:cursor-wait disabled:opacity-60"
        >
          {registerMutation.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-hero-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="site-link rounded-sm font-medium text-hero-blue underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
}