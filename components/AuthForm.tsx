"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Sign-up with email confirmation returns a user but no session.
    if (mode === "signup" && !data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("signin");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-brand-100 bg-white p-7 shadow-sm"
    >
      <div>
        <h1 className="font-serif text-2xl font-semibold text-brand-900">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          Manage your organisation&rsquo;s audits and reports.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-brand-600">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-brand-200 px-3 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium text-brand-600">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-brand-200 px-3 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {notice && <p className="text-xs text-emerald-700">{notice}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-10 w-full rounded-md bg-accent-500 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {loading
          ? "Please wait…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
        className="w-full text-center text-xs text-brand-500 hover:text-brand-800"
      >
        {mode === "signin"
          ? "No account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
