import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

// Reflect runtime Supabase configuration rather than build-time.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-5 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 font-serif text-lg font-semibold text-brand-900"
      >
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded bg-brand-900 text-xs font-bold text-white"
        >
          5C
        </span>
        Workplace Mind Audit
      </Link>

      {isSupabaseConfigured() ? <AuthForm /> : <SetupNotice />}
    </main>
  );
}
