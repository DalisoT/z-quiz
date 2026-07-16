import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already signed in, send straight to the dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-brand uppercase tracking-wide">
          Z-Quiz
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl">
          Past papers. Smart marking. Built for Zambian learners.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl">
          Practice ECZ past papers for G7–G12 and GCE. MCQ quizzes for now, AI
          marking and handwriting recognition coming soon.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link
            href="/signup"
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-base font-semibold text-brand-foreground shadow-sm hover:opacity-90 transition"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-3 text-base font-semibold text-foreground hover:bg-muted transition"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          v1 — MCQ quizzes only. AI features rolling out next.
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} Z-Quiz · Built for ECZ learners
      </footer>
    </main>
  );
}
