import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ attemptId: string }> };

export default async function ResultPage({ params }: Props) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch attempt + quiz + topic + subject (RLS makes sure we only see our own)
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select(
      `
      id,
      marks_obtained,
      total_marks,
      submitted_at,
      quizzes (
        title,
        topics (
          name,
          subjects ( name, slug )
        )
      ),
      attempt_answers (
        is_correct,
        marks_awarded,
        selected_option_id,
        questions (
          id,
          prompt,
          marks,
          explanation,
          question_options ( id, label, text, is_correct )
        )
      )
    `,
    )
    .eq("id", attemptId)
    .single();

  if (!attempt) notFound();

  const pct =
    attempt.total_marks && attempt.total_marks > 0
      ? Math.round(
          ((attempt.marks_obtained ?? 0) / attempt.total_marks) * 100,
        )
      : 0;

  const subject = attempt.quizzes?.topics?.subjects;
  const answers = attempt.attempt_answers ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
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
        {" / "}
        <span className="text-foreground">Results</span>
      </div>

      {/* Score card */}
      <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 text-center">
        <p className="text-sm font-semibold text-brand uppercase tracking-wide">
          {pct >= 70 ? "Nice work! 🎉" : pct >= 50 ? "Not bad — keep going" : "Keep practising"}
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
          {attempt.marks_obtained ?? 0} / {attempt.total_marks ?? 0}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {pct}% on {attempt.quizzes?.title}
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
          >
            Back to dashboard
          </Link>
          {subject && (
            <Link
              href={`/subjects/${subject.slug}`}
              className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 transition"
            >
              More {subject.name} quizzes
            </Link>
          )}
        </div>
      </div>

      {/* Question review */}
      <div>
        <h2 className="text-lg font-semibold">Review your answers</h2>
        <ol className="mt-3 space-y-4">
          {answers.map((a, idx) => {
            const q = a.questions;
            const options = (q?.question_options ?? []).sort(
              (x: { label: string }, y: { label: string }) =>
                x.label.localeCompare(y.label),
            );
            const correctOpt = options.find(
              (o: { is_correct: boolean }) => o.is_correct,
            );
            const userOpt = options.find(
              (o: { id: string }) => o.id === a.selected_option_id,
            );
            return (
              <li
                key={q?.id ?? idx}
                className={`rounded-xl border p-4 sm:p-5 ${
                  a.is_correct
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {idx + 1} · {a.is_correct ? "Correct" : "Incorrect"} ·{" "}
                  {a.marks_awarded} / {q?.marks}
                </p>
                <p className="mt-1 font-medium">{q?.prompt}</p>

                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Your answer: </span>
                    <span className="font-medium">
                      {userOpt
                        ? `${userOpt.label}. ${userOpt.text}`
                        : "Skipped"}
                    </span>
                  </p>
                  {!a.is_correct && correctOpt && (
                    <p>
                      <span className="text-muted-foreground">
                        Correct answer:{" "}
                      </span>
                      <span className="font-medium">
                        {correctOpt.label}. {correctOpt.text}
                      </span>
                    </p>
                  )}
                  {q?.explanation && (
                    <p className="mt-2 text-muted-foreground">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
