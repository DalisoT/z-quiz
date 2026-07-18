import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export default async function SubjectPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch the subject with its topics and (published) quizzes
  const { data: subject } = await supabase
    .from("subjects")
    .select(
      `
      id,
      name,
      slug,
      icon,
      grades ( code, name ),
      topics (
        id,
        name,
        slug,
        display_order,
        quizzes (
          id,
          title,
          description,
          time_limit_minutes
        )
      )
    `,
    )
    .eq("slug", slug)
    .order("display_order", { referencedTable: "topics", ascending: true })
    .single();

  if (!subject) notFound();

  const topics = (subject.topics ?? []).sort(
    (a, b) => a.display_order - b.display_order,
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-3xl">{subject.icon ?? "📘"}</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {subject.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {subject.grades?.name}
            </p>
          </div>
        </div>
      </div>

      {topics.length === 0 && (
        <p className="text-sm text-muted-foreground">No topics yet.</p>
      )}

      <div className="space-y-6">
        {topics.map((t) => {
          const quizzes = (t.quizzes ?? []).filter(
            (q: { title: string }) => q.title,
          );
          return (
            <section key={t.id}>
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                {t.name}
              </h2>
              {quizzes.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No quizzes yet for this topic.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {quizzes.map((q: {
                    id: string;
                    title: string;
                    description: string | null;
                    time_limit_minutes: number | null;
                  }) => (
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
                          </div>
                          {q.time_limit_minutes && (
                            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                              {q.time_limit_minutes} min
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
