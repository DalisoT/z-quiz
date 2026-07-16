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

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {recentAttempts && recentAttempts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {recentAttempts.map((a) => {
              const quiz = Array.isArray(a.quizzes)
                ? a.quizzes[0]
                : a.quizzes;
              return (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-white px-4 py-3 flex items-center justify-between"
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
