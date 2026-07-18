import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch grades with their subjects (for the home screen)
  const { data: grades } = await supabase
    .from("grades")
    .select(
      `
      id,
      code,
      name,
      subjects (
        id,
        name,
        slug,
        icon
      )
    `,
    )
    .order("display_order", { ascending: true });

  // Recent attempts
  const { data: recentAttempts } = await supabase
    .from("quiz_attempts")
    .select(
      `
      id,
      marks_obtained,
      total_marks,
      submitted_at,
      status,
      quizzes ( title )
    `,
    )
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(5);

  // Per-topic progress (for the "Continue learning" section)
  const { data: topicProgress } = await supabase
    .from("user_topic_progress")
    .select(
      `
      attempts_count,
      total_score,
      max_possible_score,
      last_attempt_at,
      topics ( id, name, slug, subjects ( name, slug ) )
    `,
    )
    .eq("user_id", user!.id)
    .order("last_attempt_at", { ascending: false })
    .limit(4);

  // Overall stats
  const { data: allAttempts } = await supabase
    .from("quiz_attempts")
    .select("marks_obtained, total_marks, status")
    .eq("user_id", user!.id)
    .eq("status", "graded");

  const totalAttempts = allAttempts?.length ?? 0;
  const avgPct =
    totalAttempts > 0
      ? Math.round(
          (allAttempts!.reduce((sum, a) => {
            if (!a.total_marks) return sum;
            return sum + ((a.marks_obtained ?? 0) / a.total_marks) * 100;
          }, 0) /
            totalAttempts) *
            10,
        ) / 10
      : 0;
  const topicsStarted = topicProgress?.length ?? 0;

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pick a subject to start practising past papers.
        </p>
      </section>

      {/* Stats summary */}
      {totalAttempts > 0 && (
        <section className="grid grid-cols-3 gap-3">
          <StatCard label="Quizzes taken" value={String(totalAttempts)} />
          <StatCard label="Average score" value={`${avgPct}%`} />
          <StatCard label="Topics started" value={String(topicsStarted)} />
        </section>
      )}

      {/* Continue learning */}
      {topicProgress && topicProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Continue learning</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topicProgress.map((tp) => {
              const topic = Array.isArray(tp.topics) ? tp.topics[0] : tp.topics;
              const subject = topic?.subjects
                ? Array.isArray(topic.subjects)
                  ? topic.subjects[0]
                  : topic.subjects
                : null;
              const pct =
                tp.max_possible_score && Number(tp.max_possible_score) > 0
                  ? Math.round(
                      (Number(tp.total_score) /
                        Number(tp.max_possible_score)) *
                        100,
                    )
                  : 0;
              if (!topic) return null;
              return (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.id}`}
                  className="rounded-xl border border-border bg-white p-4 hover:border-brand hover:shadow-sm transition"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {subject?.name ?? "Topic"}
                  </p>
                  <p className="mt-1 font-semibold">{topic.name}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {tp.attempts_count} attempt
                      {tp.attempts_count === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-brand">{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {recentAttempts && recentAttempts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {recentAttempts.map((a) => {
              const quiz = Array.isArray(a.quizzes) ? a.quizzes[0] : a.quizzes;
              return (
                <li key={a.id}>
                  <Link
                    href={`/results/${a.id}`}
                    className="rounded-lg border border-border bg-white px-4 py-3 flex items-center justify-between hover:border-brand transition"
                  >
                    <div>
                      <p className="font-medium">{quiz?.title ?? "Quiz"}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleString()
                          : "In progress"}
                      </p>
                    </div>
                    {a.marks_obtained != null && a.total_marks ? (
                      <span className="text-sm font-semibold text-brand">
                        {a.marks_obtained} / {a.total_marks}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No attempts yet. Pick a subject below to start.
          </p>
        )}
      </section>

      {/* Subjects by grade */}
      <section>
        <h2 className="text-lg font-semibold">Subjects</h2>
        <div className="mt-3 space-y-6">
          {(grades ?? []).map((g) => (
            <div key={g.id}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {g.name}
              </h3>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(g.subjects ?? []).map((s) => (
                  <Link
                    key={s.id}
                    href={`/subjects/${s.slug}`}
                    className="rounded-xl border border-border bg-white p-4 hover:border-brand hover:shadow-sm transition"
                  >
                    <div className="text-2xl">{s.icon ?? "📘"}</div>
                    <p className="mt-2 font-semibold text-sm">{s.name}</p>
                  </Link>
                ))}
                {(!g.subjects || g.subjects.length === 0) && (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No subjects yet.
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!grades || grades.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No grades configured yet.
            </p>
          )}
        </div>
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
