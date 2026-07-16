/**
 * Root middleware. Refreshes the Supabase session on every request and
 * enforces auth on protected routes. See `lib/supabase/middleware.ts` for
 * the actual logic.
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     *  - _next/static (static files)
     *  - _next/image (image optimization files)
     *  - favicon.ico
     *  - Any path that contains a dot (assets, .well-known, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
