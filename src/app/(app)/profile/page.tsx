import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../../(auth)/actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, grade_code, created_at")
    .eq("id", user.id)
    .single();

  // All attempts for full history
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select(
      `
      id,
      marks_obtained,
      total_marks,
      submitted_at,
      status,
      quizzes ( title, topics ( name, subjects ( name, slug ) ) )
    `,
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const totalAttempts = attempts?.length ?? 0;
  const graded = (attempts ?? []).filter((a) => a.status === "graded");
  const avgPct =
    graded.length > 0
      ? Math.round(
          (graded.reduce((s, a) => {
            if (!a.total_marks) return s;
            return s + ((a.marks_obtained ?? 0) / a.total_marks) * 100;
          }, 0) /
            graded.length) *
            10,
        ) / 10
      : 0;
  const bestPct =
    graded.length > 0
      ? Math.max(
          ...graded.map((a) =>
            a.total_marks ? ((a.marks_obtained ?? 0) / a.total_marks) * 100 : 0,
          ),
        )
      : 0;

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Learner";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : "—";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-2xl font-semibold">
          {displayName[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Quizzes" value={String(totalAttempts)} />
        <StatCard label="Average" value={`${avgPct}%`} />
        <StatCard label="Best" value={`${Math.round(bestPct)}%`} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">All attempts</h2>
        {!attempts || attempts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No attempts yet.{" "}
            <Link href="/dashboard" className="text-brand hover:underline">
              Start practising
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {attempts.map((a) => {
              const quiz = Array.isArray(a.quizzes) ? a.quizzes[0] : a.quizzes;
              const topic = quiz?.topics
                ? Array.isArray(quiz.topics)
                  ? quiz.topics[0]
                  : quiz.topics
                : null;
              const subject = topic?.subjects
                ? Array.isArray(topic.subjects)
                  ? topic.subjects[0]
                  : topic.subjects
                : null;
              const pct =
                a.total_marks && a.marks_obtained != null
                  ? Math.round((a.marks_obtained / a.total_marks) * 100)
                  : null;
              return (
                <li key={a.id}>
                  <Link
                    href={`/results/${a.id}`}
                    className="rounded-lg border border-border bg-white px-4 py-3 flex items-center justify-between hover:border-brand transition"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {quiz?.title ?? "Quiz"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subject?.name ?? ""}
                        {topic?.name ? ` · ${topic.name}` : ""}
                        {" · "}
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleDateString()
                          : "In progress"}
                      </p>
                    </div>
                    {pct != null ? (
                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          pct >= 70
                            ? "text-green-600"
                            : pct >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {pct}%
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 sm:p-4 text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
