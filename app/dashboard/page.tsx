import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { CreateAuditForm } from "@/components/CreateAuditForm";
import type { Audit } from "@/types";

// Auth + per-user data: always render at request time.
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-brand-100 text-brand-600",
  open: "bg-emerald-100 text-emerald-700",
  closed: "bg-brand-200 text-brand-700",
};

export default async function DashboardHomePage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  const { data } = await supabase
    .from("audits")
    .select("id, org_id, title, status, public_token, segments, opened_at, closed_at, created_at")
    .order("created_at", { ascending: false });

  const audits = (data ?? []) as Audit[];

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <section>
        <h1 className="font-serif text-2xl font-semibold text-brand-900">
          Your audits
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          Each audit has an anonymous survey link to share with your team.
        </p>

        {audits.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-brand-200 bg-white p-8 text-center text-sm text-brand-500">
            No audits yet. Create your first one to get a shareable survey link.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {audits.map((audit) => (
              <li
                key={audit.id}
                className="rounded-xl border border-brand-100 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/dashboard/${audit.id}`}
                    className="font-medium text-brand-900 hover:text-accent-700"
                  >
                    {audit.title}
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[audit.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {audit.status}
                  </span>
                </div>
                <p className="mt-2 break-all text-xs text-brand-400">
                  Survey link: <span className="text-brand-500">/survey/{audit.public_token}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside>
        <div className="rounded-xl border border-brand-100 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-brand-900">
            New audit
          </h2>
          <p className="mt-1 text-sm text-brand-500">
            Opens immediately so you can start collecting anonymous responses.
          </p>
          <div className="mt-4">
            <CreateAuditForm />
          </div>
        </div>
      </aside>
    </div>
  );
}
