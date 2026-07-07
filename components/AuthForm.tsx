"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Could not create account");
          setSubmitting(false);
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Incorrect email or password");
        setSubmitting(false);
        return;
      }
      window.location.href = "/games";
    } catch {
      setError("Something went wrong — try again");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      {mode === "sign-up" && (
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-primary"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-border bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="password"
        placeholder="Password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-border bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-primary"
      />

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <Link
        href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
        className="text-center text-sm text-muted-foreground underline hover:text-foreground"
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </Link>
    </form>
  );
}
