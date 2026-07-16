/**
 * Browser-side Supabase client.
 *
 * Use this inside Client Components (`"use client"`) for any data fetching
 * that should run in the browser. Never call this from a Server Component
 * or Route Handler — use `lib/supabase/server.ts` instead.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
