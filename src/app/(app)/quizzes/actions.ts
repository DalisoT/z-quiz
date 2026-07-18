"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Submit a quiz attempt. The form sends `question_<id>=<option_id>` for every
 * question. We:
 *   1. Create a quiz_attempts row (status: graded, marks: filled in)
 *   2. Insert one attempt_answers row per question with the user's pick
 *   3. Calculate marks server-side (don't trust the client)
 *   4. Redirect to /results/<attemptId>
 */
export async function submitQuiz(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const quizId = String(formData.get("quiz_id") ?? "");
  if (!quizId) throw new Error("Missing quiz_id");

  // 1. Load quiz questions + correct options in one shot
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      time_limit_minutes,
      quiz_questions (
        display_order,
        questions (
          id,
          marks,
          question_options ( id, is_correct )
        )
      )
    `,
    )
    .eq("id", quizId)
    .single();

  if (!quiz) throw new Error("Quiz not found");

  // Flatten questions + options, preserve display order
  const ordered = (quiz.quiz_questions ?? [])
    .sort(
      (a: { display_order: number }, b: { display_order: number }) =>
        a.display_order - b.display_order,
    )
    .map(
      (qq: {
        questions: {
          id: string;
          marks: number;
          question_options: { id: string; is_correct: boolean }[];
        };
      }) => qq.questions,
    );

  // 2. Compute score from the form data
  let totalMarks = 0;
  let marksObtained = 0;
  type AnswerRow = {
    question_id: string;
    selected_option_id: string | null;
    is_correct: boolean;
    marks_awarded: number;
  };
  const answers: AnswerRow[] = [];

  for (const q of ordered) {
    totalMarks += q.marks;
    const picked = formData.get(`question_${q.id}`);
    const pickedOptionId =
      typeof picked === "string" && picked.length > 0 ? picked : null;

    const correctOption = q.question_options.find(
      (o: { is_correct: boolean }) => o.is_correct,
    );

    const isCorrect =
      pickedOptionId !== null && correctOption?.id === pickedOptionId;

    const marksAwarded = isCorrect ? q.marks : 0;
    marksObtained += marksAwarded;

    answers.push({
      question_id: q.id,
      selected_option_id: pickedOptionId,
      is_correct: isCorrect,
      marks_awarded: marksAwarded,
    });
  }

  // 3. Insert attempt
  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      submitted_at: new Date().toISOString(),
      total_marks: totalMarks,
      marks_obtained: marksObtained,
      status: "graded",
    })
    .select("id")
    .single();

  if (attemptErr || !attempt) {
    throw new Error(`Failed to create attempt: ${attemptErr?.message}`);
  }

  // 4. Insert all answers
  const { error: answersErr } = await supabase.from("attempt_answers").insert(
    answers.map((a) => ({
      attempt_id: attempt.id,
      question_id: a.question_id,
      selected_option_id: a.selected_option_id,
      is_correct: a.is_correct,
      marks_awarded: a.marks_awarded,
      marked_by: "auto" as const,
    })),
  );

  if (answersErr) {
    throw new Error(`Failed to save answers: ${answersErr.message}`);
  }

  // 5. Update user_topic_progress (denormalized cache)
  //    We just need the topic for this quiz to bump the count.
  const { data: quizTopic } = await supabase
    .from("quizzes")
    .select("topic_id")
    .eq("id", quizId)
    .single();

  if (quizTopic) {
    const { data: existing } = await supabase
      .from("user_topic_progress")
      .select("attempts_count, total_score, max_possible_score")
      .eq("user_id", user.id)
      .eq("topic_id", quizTopic.topic_id)
      .maybeSingle();

    const newCount = (existing?.attempts_count ?? 0) + 1;
    const newTotal = Number(existing?.total_score ?? 0) + marksObtained;
    const newMax = Number(existing?.max_possible_score ?? 0) + totalMarks;

    await supabase.from("user_topic_progress").upsert(
      {
        user_id: user.id,
        topic_id: quizTopic.topic_id,
        attempts_count: newCount,
        total_score: newTotal,
        max_possible_score: newMax,
        last_attempt_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_id" },
    );
  }

  revalidatePath("/dashboard");
  redirect(`/results/${attempt.id}`);
}
