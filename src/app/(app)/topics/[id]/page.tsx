import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function TopicPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Topic + subject (for breadcrumb)
  const { data: topic } = await supabase
    .from("topics")
    .select(
      `
      id,
      name,
      slug,
      subjects ( id, name, slug, grades ( name ) ),
      quizzes ( id, title, description, time_limit_minutes, is_published )
    `,
    )
    .eq("id", id)
    .single();

  if (!topic) notFound();

  const subject = Array.isArray(topic.subjects) ? topic.subjects[0] : topic.subjects;

  // Per-quiz best score for this user
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, marks_obtained, total_marks, status")
    .eq("user_id", user!.id)
    .eq("status", "graded")
    .in(
      "quiz_id",
      (topic.quizzes ?? []).map((q: { id: string }) => q.id),
    );

  const bestByQuiz = new Map<string, number>();
  for (const a of attempts ?? []) {
    if (!a.total_marks || a.marks_obtained == null) continue;
    const pct = (a.marks_obtained / a.total_marks) * 100;
    const prev = bestByQuiz.get(a.quiz_id) ?? -1;
    if (pct > prev) bestByQuiz.set(a.quiz_id, pct);
  }

  // Aggregate topic stats
  const { data: topicProgress } = await supabase
    .from("user_topic_progress")
    .select("attempts_count, total_score, max_possible_score")
    .eq("user_id", user!.id)
    .eq("topic_id", id)
    .maybeSingle();

  const topicPct =
    topicProgress && Number(topicProgress.max_possible_score) > 0
      ? Math.round(
          (Number(topicProgress.total_score) /
            Number(topicProgress.max_possible_score)) *
            100,
        )
      : null;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          {" / "}
          {subject && (
            <Link
              href={`/subjects/${subject.slug}`}
              className="hover:underline"
            >
              {subject.name}
            </Link>
          )}
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
          {topic.name}
        </h1>
        {subject && (
          <p className="text-sm text-muted-foreground">
            {subject.grades?.name} · {subject.name}
          </p>
        )}
      </div>

      {topicProgress && (
        <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your progress
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-3xl font-bold tracking-tight">
              {topicPct ?? 0}%
            </p>
            <p className="text-sm text-muted-foreground">
              across {topicProgress.attempts_count} attempt
              {topicProgress.attempts_count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${topicPct ?? 0}%` }}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Quizzes</h2>
        {(topic.quizzes ?? []).filter((q: { is_published: boolean }) => q.is_published)
          .length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No published quizzes for this topic yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {topic.quizzes
              .filter((q: { is_published: boolean }) => q.is_published)
              .map((q: {
                id: string;
                title: string;
                description: string | null;
                time_limit_minutes: number | null;
              }) => {
                const best = bestByQuiz.get(q.id);
                return (
                  <li key={q.id}>
                    <Link
                      href={`/quizzes/${q.id}`}
                      className="block rounded-xl border border-border bg-white p-4 hover:border-brand hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{q.title}</p>
                          {q.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {q.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {q.time_limit_minutes && (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                                {q.time_limit_minutes} min
                              </span>
                            )}
                            {best != null && (
                              <span
                                className={`rounded-md px-2 py-0.5 font-semibold ${
                                  best >= 70
                                    ? "bg-green-100 text-green-700"
                                    : best >= 50
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                Best: {Math.round(best)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
