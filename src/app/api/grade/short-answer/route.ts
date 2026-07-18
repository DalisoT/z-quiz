/**
 * POST /api/grade/short-answer
 *
 * Body: {
 *   question: string,
 *   expectedAnswer: string,
 *   studentAnswer: string,
 *   maxMarks: number,
 *   markingNotes?: string,
 *   acceptableVariations?: string[]
 * }
 *
 * Returns: {
 *   marks: number,           // 0..maxMarks, may be fractional
 *   maxMarks: number,
 *   reasoning: string,       // short explanation
 *   confidence: "high" | "medium" | "low"
 * }
 *
 * Auth: requires a signed-in user. Uses their session for logging/audit.
 *       (We don't rate-limit per user yet — add that if abuse becomes a thing.)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatJson, AIError, isAIConfigured } from "@/lib/ai/minimax";

export const runtime = "nodejs"; // ensure Node runtime (fetch with keepalive ok)
export const dynamic = "force-dynamic";

type RequestBody = {
  question: string;
  expectedAnswer: string;
  studentAnswer: string;
  maxMarks: number;
  markingNotes?: string;
  acceptableVariations?: string[];
};

type GradeResponse = {
  marks: number;
  maxMarks: number;
  reasoning: string;
  confidence: "high" | "medium" | "low";
};

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, expectedAnswer, studentAnswer, maxMarks } = body;
  if (
    typeof question !== "string" ||
    typeof expectedAnswer !== "string" ||
    typeof studentAnswer !== "string" ||
    typeof maxMarks !== "number" ||
    maxMarks <= 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields" },
      { status: 400 },
    );
  }

  // 3. Empty / whitespace student answer → 0 marks, no AI call (saves $$)
  const trimmedStudent = studentAnswer.trim();
  if (trimmedStudent.length === 0) {
    const resp: GradeResponse = {
      marks: 0,
      maxMarks,
      reasoning: "No answer provided.",
      confidence: "high",
    };
    return NextResponse.json(resp);
  }

  // 4. If AI is not configured, return a graceful fallback
  if (!isAIConfigured()) {
    const resp: GradeResponse = {
      marks: 0,
      maxMarks,
      reasoning:
        "AI marking is not configured on this deployment. Add MINIMAX_API_KEY / MINIMAX_BASE_URL / MINIMAX_MODEL to .env.local.",
      confidence: "low",
    };
    return NextResponse.json(resp, { status: 503 });
  }

  // 5. Call the AI with a structured marking prompt
  const systemPrompt = `You are a fair, strict-but-reasonable secondary school teacher marking a Zambian exam answer.

Your job: compare a student's answer to the expected answer and assign a mark between 0 and maxMarks.

Rules:
- Award full marks when the student demonstrates the required concept, even if wording differs.
- Award partial credit when the student shows partial understanding.
- Award 0 only when the answer is wrong, irrelevant, or shows no understanding.
- Be especially generous with synonyms and paraphrases — if the idea is right, the mark should reflect that.
- If the expected answer lists multiple required points, divide the marks roughly equally across them and check each.
- Do NOT invent requirements that aren't in the expected answer or marking notes.

You MUST respond with a single JSON object and nothing else. Use exactly this shape:
{
  "marks": <number between 0 and maxMarks>,
  "reasoning": "<one or two short sentences explaining the mark>",
  "confidence": "high" | "medium" | "low"
}

Use "low" confidence when the student's answer is ambiguous, contradictory, or could be interpreted multiple ways.`;

  const userPrompt = `Question: ${question}

Maximum marks: ${maxMarks}

Expected answer:
${expectedAnswer}

${body.markingNotes ? `Marking notes from the teacher:\n${body.markingNotes}\n` : ""}${body.acceptableVariations && body.acceptableVariations.length > 0
      ? `Acceptable variations of the answer:\n- ${body.acceptableVariations.join("\n- ")}\n`
      : ""
    }Student's answer:
${trimmedStudent}

Now respond with ONLY the JSON object.`;

  try {
    const result = await chatJson<{
      marks: number;
      reasoning: string;
      confidence?: "high" | "medium" | "low";
    }>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2, maxTokens: 400 },
    );

    // Clamp marks into the valid range
    const clampedMarks = Math.max(
      0,
      Math.min(maxMarks, Number(result.marks) || 0),
    );

    const resp: GradeResponse = {
      marks: clampedMarks,
      maxMarks,
      reasoning: result.reasoning || "No reasoning returned.",
      confidence: result.confidence ?? "medium",
    };
    return NextResponse.json(resp);
  } catch (err) {
    if (err instanceof AIError) {
      console.error("[grade/short-answer] AI error:", err.message, err.body);
      return NextResponse.json(
        {
          error: "AI marking failed",
          detail: err.message,
        },
        { status: 502 },
      );
    }
    console.error("[grade/short-answer] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error during AI marking" },
      { status: 500 },
    );
  }
}
