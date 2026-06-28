/**
 * Shown wherever Supabase is required but not configured. Keeps the app honest
 * and self-documenting instead of throwing.
 */
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-brand-100 bg-brand-50 p-6">
      <h2 className="font-serif text-xl font-semibold text-brand-900">
        Connect Supabase to enable accounts
      </h2>
      <p className="mt-2 text-sm text-brand-600">
        Sign-in, audits, and the dashboard need a Supabase project. The calculator
        and marketing site work without it.
      </p>
      <ol className="mt-4 space-y-2 text-sm text-brand-700">
        <li>
          1. Create a project at{" "}
          <span className="font-medium">supabase.com</span>.
        </li>
        <li>
          2. Set <code className="text-accent-700">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="text-accent-700">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,
          and{" "}
          <code className="text-accent-700">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code className="text-accent-700">.env.local</code>.
        </li>
        <li>
          3. Apply the SQL in{" "}
          <code className="text-accent-700">supabase/migrations</code>.
        </li>
      </ol>
    </div>
  );
}
