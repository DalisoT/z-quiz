"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Submit a quiz attempt. The form sends one of:
 *   - `option_<question_id>` = option_id      (MCQ)
 *   - `text_<question_id>`   = free text      (short_answer)
 *
 * We:
 *   1. Load the quiz, its questions, options, AND expected answers.
 *   2. Auto-mark MCQs server-side.
 *   3. For short_answer questions, call /api/grade/short-answer to get an AI mark.
 *   4. Insert the attempt + all attempt_answers in one go.
 *   5. Update user_topic_progress (denormalized cache).
 *   6. Redirect to /results/<attemptId>.
 */
export async function submitQuiz(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const quizId = String(formData.get("quiz_id") ?? "");
  if (!quizId) throw new Error("Missing quiz_id");

  // 1. Load quiz, questions, options, AND expected answers
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
          prompt,
          marks,
          question_type,
          question_options ( id, is_correct ),
          question_answers ( expected_answer, marking_notes, acceptable_variations )
        )
      )
    `,
    )
    .eq("id", quizId)
    .single();

  if (!quiz) throw new Error("Quiz not found");

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
          marks: number;
          question_type: string;
          question_options: { id: string; is_correct: boolean }[];
          question_answers: {
            expected_answer: string;
            marking_notes: string | null;
            acceptable_variations: string[] | null;
          }[];
        };
      }) => qq.questions,
    );

  // 2. Score each question based on its type
  let totalMarks = 0;
  let marksObtained = 0;
  type AnswerRow = {
    question_id: string;
    selected_option_id: string | null;
    text_answer: string | null;
    is_correct: boolean | null;
    marks_awarded: number;
    marked_by: "auto" | "ai" | "human";
    ai_reasoning: string | null;
    ai_confidence: "high" | "medium" | "low" | null;
  };
  const answers: AnswerRow[] = [];

  for (const q of ordered) {
    totalMarks += q.marks;
    const isMCQ = q.question_type === "mcq";
    const isShortAnswer =
      q.question_type === "short_answer" || q.question_type === "essay";

    if (isMCQ) {
      // --- Auto-mark MCQ ---
      const picked = formData.get(`option_${q.id}`);
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
        text_answer: null,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        marked_by: "auto",
        ai_reasoning: null,
        ai_confidence: null,
      });
    } else if (isShortAnswer) {
      // --- AI mark short_answer / essay ---
      const text = String(formData.get(`text_${q.id}`) ?? "");
      const expected = q.question_answers?.[0]?.expected_answer ?? "";
      const markingNotes = q.question_answers?.[0]?.marking_notes ?? undefined;
      const acceptableVariations =
        q.question_answers?.[0]?.acceptable_variations ?? undefined;

      let aiMarks = 0;
      let aiIsCorrect: boolean | null = false;
      let aiReasoning: string | null = null;
      let aiConfidence: "high" | "medium" | "low" | null = null;

      // Skip the AI call for empty answers — saves money + latency.
      if (text.trim().length === 0) {
        aiMarks = 0;
        aiIsCorrect = false;
        aiReasoning = "No answer provided.";
        aiConfidence = "high";
      } else if (expected.length === 0) {
        aiMarks = 0;
        aiIsCorrect = false;
        aiReasoning = "No expected answer configured for this question.";
        aiConfidence = "low";
      } else {
        try {
          // Use the app's own API route (server-to-server fetch).
          // IMPORTANT: forward the request's cookies so the API route can
          // authenticate the user. Without this, the API route's auth check
          // returns 401 because the fetch doesn't carry the session cookie.
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const cookieStore = await cookies();
          const cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");

          const res = await fetch(`${appUrl}/api/grade/short-answer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookieHeader,
            },
            body: JSON.stringify({
              question: q.prompt,
              expectedAnswer: expected,
              studentAnswer: text,
              maxMarks: q.marks,
              markingNotes,
              acceptableVariations,
            }),
            // 35s — slightly more than the API's own 30s timeout
            signal: AbortSignal.timeout(35_000),
            cache: "no-store",
          });

          if (res.ok) {
            const data = (await res.json()) as {
              marks: number;
              reasoning?: string;
              confidence?: "high" | "medium" | "low";
            };
            aiMarks = Number(data.marks) || 0;
            aiReasoning = data.reasoning ?? null;
            aiConfidence = data.confidence ?? null;
            // Treat >= 50% as "correct-ish" for colour coding.
            aiIsCorrect = aiMarks / q.marks >= 0.5;
          } else {
            console.error("[submitQuiz] AI route returned", res.status);
            aiIsCorrect = null;
            aiReasoning = `AI marking unavailable (HTTP ${res.status}). Try again later.`;
          }
        } catch (err) {
          console.error("[submitQuiz] AI call failed:", err);
          aiIsCorrect = null;
          aiReasoning = "AI marking failed. Your answer was saved but not graded.";
        }
      }

      marksObtained += aiMarks;
      answers.push({
        question_id: q.id,
        selected_option_id: null,
        text_answer: text,
        is_correct: aiIsCorrect,
        marks_awarded: aiMarks,
        marked_by: "ai",
        ai_reasoning: aiReasoning,
        ai_confidence: aiConfidence,
      });
    } else {
      // Unknown question type — skip safely
      answers.push({
        question_id: q.id,
        selected_option_id: null,
        text_answer: null,
        is_correct: null,
        marks_awarded: 0,
        marked_by: "auto",
        ai_reasoning: null,
        ai_confidence: null,
      });
    }
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
      text_answer: a.text_answer,
      is_correct: a.is_correct,
      marks_awarded: a.marks_awarded,
      marked_by: a.marked_by,
      ai_reasoning: a.ai_reasoning,
      ai_confidence: a.ai_confidence,
    })),
  );

  if (answersErr) {
    throw new Error(`Failed to save answers: ${answersErr.message}`);
  }

  // 5. Update user_topic_progress (denormalized cache)
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
