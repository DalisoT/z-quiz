import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitQuiz } from "../actions";
import { EquationImageInput } from "@/components/quiz/equation-image-input";

type Props = { params: Promise<{ id: string }> };

export default async function QuizPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Quiz + topic + subject (for breadcrumbs)
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      title,
      description,
      time_limit_minutes,
      topics (
        name,
        slug,
        subjects ( name, slug, grades ( name ) )
      ),
      quiz_questions (
        display_order,
        questions (
          id,
          prompt,
          question_type,
          marks,
          explanation,
          question_options (
            id,
            label,
            text,
            display_order
          )
        )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!quiz) notFound();

  const ordered = (quiz.quiz_questions ?? [])
    .sort(
      (a: { display_order: number }, b: { display_order: number }) =>
        a.display_order - b.display_order,
    )
    .map(
      (qq: {
        questions: {
          id: string;
          prompt: string;
          question_type: string;
          marks: number;
          explanation: string | null;
          question_options: {
            id: string;
            label: string;
            text: string;
            display_order: number;
          }[];
        };
      }) => qq.questions,
    );

  const totalMarks = ordered.reduce(
    (sum: number, q: { marks: number }) => sum + q.marks,
    0,
  );

  const subject = quiz.topics?.subjects;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        {" / "}
        {subject && (
          <>
            <Link
              href={`/subjects/${subject.slug}`}
              className="hover:underline"
            >
              {subject.name}
            </Link>
            {" / "}
          </>
        )}
        <span className="text-foreground">{quiz.topics?.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="mt-1 text-muted-foreground">{quiz.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
            {ordered.length} question{ordered.length === 1 ? "" : "s"}
          </span>
          <span className="rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
            {totalMarks} mark{totalMarks === 1 ? "" : "s"}
          </span>
          {quiz.time_limit_minutes && (
            <span className="rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
              {quiz.time_limit_minutes} min
            </span>
          )}
          {ordered.some(
            (q: { question_type: string }) => q.question_type === "equation",
          ) && (
            <span className="rounded-md bg-blue-100 px-2 py-1 font-medium text-blue-800">
              Photo upload required
            </span>
          )}
          {ordered.some(
            (q: { question_type: string }) =>
              q.question_type === "short_answer" || q.question_type === "essay",
          ) && (
            <span className="rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-800">
              AI-marked text questions
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <form action={submitQuiz} className="space-y-5">
        <input type="hidden" name="quiz_id" value={quiz.id} />

        {ordered.map(
          (
            q: {
              id: string;
              prompt: string;
              question_type: string;
              marks: number;
              explanation: string | null;
              question_options: {
                id: string;
                label: string;
                text: string;
                display_order: number;
              }[];
            },
            idx: number,
          ) => {
            const isMCQ = q.question_type === "mcq";
            const isEquation = q.question_type === "equation";
            return (
              <fieldset
                key={q.id}
                className="rounded-xl border border-border bg-white p-4 sm:p-5"
              >
                <legend className="px-1 text-sm font-semibold text-muted-foreground">
                  Question {idx + 1} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                  {isEquation && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                      VISION-MARKED · PHOTO REQUIRED
                    </span>
                  )}
                  {!isMCQ && !isEquation && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      AI-MARKED
                    </span>
                  )}
                </legend>
                <p className="mt-1 text-base font-medium leading-relaxed">
                  {q.prompt}
                </p>

                {isMCQ ? (
                  <div className="mt-4 space-y-2">
                    {[...q.question_options]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((o) => (
                        <label
                          key={o.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-brand hover:bg-muted/40 transition"
                        >
                          <input
                            type="radio"
                            name={`option_${q.id}`}
                            value={o.id}
                            className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                            required
                          />
                          <span className="flex-1 text-sm">
                            <span className="font-semibold mr-2">{o.label}.</span>
                            {o.text}
                          </span>
                        </label>
                      ))}
                  </div>
                ) : isEquation ? (
                  <div>
                    <EquationImageInput name={`image_${q.id}`} required />
                    <div className="mt-4">
                      <label
                        htmlFor={`text_${q.id}`}
                        className="block text-sm font-medium text-foreground"
                      >
                        Or type your final answer here (optional)
                      </label>
                      <textarea
                        id={`text_${q.id}`}
                        name={`text_${q.id}`}
                        rows={2}
                        className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        placeholder="e.g. x = 4"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <textarea
                      name={`text_${q.id}`}
                      rows={4}
                      required
                      className="block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      placeholder="Type your answer here…"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your answer will be marked by AI and shown on the results page.
                    </p>
                  </div>
                )}
              </fieldset>
            );
          },
        )}

        <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t border-border bg-white/95 backdrop-blur px-4 sm:px-6 py-3">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm hover:opacity-90 transition"
          >
            Submit answers
          </button>
        </div>
      </form>
    </div>
  );
}
