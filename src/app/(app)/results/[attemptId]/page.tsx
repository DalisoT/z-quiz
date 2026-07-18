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
        text_answer,
        image_storage_path,
        marked_by,
        ai_reasoning,
        ai_confidence,
        questions (
          id,
          prompt,
          question_type,
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

  // For equation answers, generate signed URLs so we can show the uploaded image
  const imagePaths = (attempt.attempt_answers ?? [])
    .map((a) => a.image_storage_path)
    .filter((p): p is string => Boolean(p));

  const signedUrlByPath = new Map<string, string>();
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("attempt-images")
      .createSignedUrls(imagePaths, 600); // 10 min
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) {
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

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
            const isMCQ = q?.question_type === "mcq";
            const isShortAnswer =
              q?.question_type === "short_answer" || q?.question_type === "essay";
            const isEquation = q?.question_type === "equation";
            const imageUrl = a.image_storage_path
              ? signedUrlByPath.get(a.image_storage_path)
              : undefined;

            // Colour hint for the card
            const isFull = (a.marks_awarded ?? 0) >= (q?.marks ?? 0);
            const isPartial =
              !isFull && (a.marks_awarded ?? 0) > 0;
            const cardBorder = isMCQ
              ? a.is_correct
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
              : isFull
                ? "border-green-200 bg-green-50"
                : isPartial
                  ? "border-amber-200 bg-amber-50"
                  : "border-red-200 bg-red-50";

            const badgeText = isMCQ
              ? a.is_correct
                ? "Correct"
                : "Incorrect"
              : isFull
                ? "Full marks"
                : isPartial
                  ? "Partial"
                  : (a.marks_awarded ?? 0) === 0
                    ? "No marks"
                    : "Marked";

            return (
              <li
                key={q?.id ?? idx}
                className={`rounded-xl border p-4 sm:p-5 ${cardBorder}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {idx + 1} · {badgeText} · {a.marks_awarded ?? 0} /{" "}
                  {q?.marks}
                  {isEquation && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                      VISION-MARKED
                    </span>
                  )}
                  {a.marked_by === "ai" && !isEquation && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      AI-MARKED
                    </span>
                  )}
                </p>
                <p className="mt-1 font-medium">{q?.prompt}</p>

                <div className="mt-3 space-y-2 text-sm">
                  {isMCQ ? (
                    <>
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
                    </>
                  ) : isEquation ? (
                    <>
                      {imageUrl ? (
                        <div>
                          <p className="text-muted-foreground">Your photo:</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt="Your handwritten work"
                            className="mt-1 max-h-80 w-full rounded-md border border-border bg-white object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">
                          (no photo submitted)
                        </p>
                      )}
                      {a.text_answer && (
                        <div>
                          <p className="text-muted-foreground">Your typed answer:</p>
                          <p className="mt-1 whitespace-pre-wrap rounded-md bg-white/60 p-3 text-foreground">
                            {a.text_answer}
                          </p>
                        </div>
                      )}
                      {a.ai_reasoning && (
                        <div className="rounded-md bg-white/60 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Vision AI reasoning
                            {a.ai_confidence && (
                              <span
                                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  a.ai_confidence === "high"
                                    ? "bg-green-100 text-green-700"
                                    : a.ai_confidence === "medium"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {a.ai_confidence} confidence
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-foreground">
                            {a.ai_reasoning}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-muted-foreground">Your answer:</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-md bg-white/60 p-3 text-foreground">
                          {a.text_answer || (
                            <span className="italic text-muted-foreground">
                              (no answer)
                            </span>
                          )}
                        </p>
                      </div>
                      {a.ai_reasoning && (
                        <div className="rounded-md bg-white/60 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            AI reasoning
                            {a.ai_confidence && (
                              <span
                                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  a.ai_confidence === "high"
                                    ? "bg-green-100 text-green-700"
                                    : a.ai_confidence === "medium"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {a.ai_confidence} confidence
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-foreground">
                            {a.ai_reasoning}
                          </p>
                        </div>
                      )}
                    </>
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
