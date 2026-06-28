import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config";

/**
 * Service-role client — BYPASSES RLS. Server-only; never import from a client
 * component. Used for trusted anonymous writes: survey responses (after the
 * public token is validated), leads, and calculator_runs.
 *
 * Returns null when not configured so callers can no-op gracefully.
 */
export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
