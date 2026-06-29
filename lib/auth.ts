import type { User } from "@supabase/supabase-js";

/**
 * True when the user carries the `consultant` role claim. Set it on your own
 * user via the Supabase dashboard (app_metadata: { "role": "consultant" }).
 * Mirrors the public.is_consultant() SQL function used in RLS.
 */
export function isConsultant(user: User | null | undefined): boolean {
  if (!user) return false;
  const appRole = (user.app_metadata as { role?: string } | undefined)?.role;
  return appRole === "consultant";
}
