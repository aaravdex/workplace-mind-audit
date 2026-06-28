import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-50">
      <header className="border-b border-brand-100 bg-white">
        <Container className="flex h-16 items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-serif text-lg font-semibold text-brand-900"
          >
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded bg-brand-900 text-xs font-bold text-white"
            >
              5C
            </span>
            Dashboard
          </Link>
          <div className="flex items-center gap-4">
            {email && (
              <span className="hidden text-sm text-brand-500 sm:block">
                {email}
              </span>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-brand-600 ring-1 ring-inset ring-brand-200 hover:bg-brand-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </Container>
      </header>

      <main className="flex-1">
        <Container className="py-10">{children}</Container>
      </main>
    </div>
  );
}
