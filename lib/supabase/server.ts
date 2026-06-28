import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * User-scoped server client (reads the session from cookies). All dashboard
 * reads/writes go through this, so RLS sees the authenticated user. Call only
 * when isSupabaseConfigured() — callers guard and render a setup notice instead.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` was called from a Server Component — safe to ignore when
          // middleware is refreshing the session.
        }
      },
    },
  });
}
