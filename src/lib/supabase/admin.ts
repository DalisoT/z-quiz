/**
 * Service-role Supabase client.
 *
 * ⚠️ SERVER-ONLY. Never import this from a Client Component — the service
 * role key bypasses all RLS policies and would expose your entire database
 * to anyone who found the bundle.
 *
 * Use this for:
 *  - Ingesting past-paper questions (admin uploads)
 *  - Background jobs / cron tasks
 *  - Anything that needs to write to content tables
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local (server-only).",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
