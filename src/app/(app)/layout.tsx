import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should have caught this, but double-check
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Learner";

  return (
    <div className="flex-1 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3">
          <Link
            href="/dashboard"
            className="text-base font-semibold text-brand uppercase tracking-wide"
          >
            Z-Quiz
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <span className="hidden sm:inline-block rounded-md px-2 sm:px-3 py-1.5 text-muted-foreground">
              {displayName}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border bg-white px-2 sm:px-3 py-1.5 text-foreground hover:bg-muted transition"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
