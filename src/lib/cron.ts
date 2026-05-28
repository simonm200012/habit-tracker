import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel cron sends a special header `Authorization: Bearer ${CRON_SECRET}`.
 * In dev or if no secret is set, we allow requests so you can call the route
 * manually for testing.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Service-role Supabase client for cron jobs (bypasses RLS).
 * Requires SUPABASE_SERVICE_ROLE_KEY env var.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
