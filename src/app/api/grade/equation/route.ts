/**
 * POST /api/grade/equation
 *
 * Body: {
 *   question: string,
 *   expectedAnswer: string,     // the correct equation / working
 *   studentAnswer: string,      // the student's text answer (e.g. "x = 5")
 *   imageUrl: string,           // public URL of the uploaded handwritten image
 *   maxMarks: number,
 *   markingNotes?: string,
 * }
 *
 * Returns: {
 *   marks: number,
 *   maxMarks: number,
 *   reasoning: string,
 *   extractedFromImage: string, // what the vision model read from the photo
 *   confidence: "high" | "medium" | "low"
 * }
 *
 * Uses the VISION_* env-var config (separate from the text-only MINIMAX_*
 * config) so a vision-capable model can be configured independently.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  chatJson,
  AIError,
  isAIConfigured,
  type ContentPart,
} from "@/lib/ai/minimax";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  question: string;
  expectedAnswer: string;
  studentAnswer: string;
  imageUrl: string;
  maxMarks: number;
  markingNotes?: string;
};

type GradeResponse = {
  marks: number;
  maxMarks: number;
  reasoning: string;
  extractedFromImage: string;
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

  const { question, expectedAnswer, studentAnswer, imageUrl, maxMarks } = body;
  if (
    typeof question !== "string" ||
    typeof expectedAnswer !== "string" ||
    typeof studentAnswer !== "string" ||
    typeof imageUrl !== "string" ||
    typeof maxMarks !== "number" ||
    maxMarks <= 0 ||
    imageUrl.length === 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid fields" },
      { status: 400 },
    );
  }

  // 3. Vision model must be configured
  if (!isAIConfigured({ vision: true })) {
    return NextResponse.json(
      {
        marks: 0,
        maxMarks,
        reasoning:
          "Vision marking is not configured. Add VISION_API_KEY, VISION_BASE_URL, and VISION_MODEL to .env.local (Google Gemini works for free).",
        extractedFromImage: "",
        confidence: "low",
      },
      { status: 503 },
    );
  }

  // 4. Build the prompt
  const systemPrompt = `You are a Zambian secondary school maths/chemistry teacher marking a student's handwritten answer.

You will be shown a photo of the student's handwritten work. Your job:
1. Carefully read the equations / formulas / working in the image.
2. Extract what the student actually wrote (step by step if there are multiple lines).
3. Compare it to the expected answer.
4. Assign a mark between 0 and maxMarks.
5. Be strict but fair — partial credit for correct method with arithmetic slips, full marks for correct answer, 0 only if irrelevant or unreadable.

If the image is unreadable, blurry, or not a maths/chem answer, set marks to 0 and explain in the reasoning.

You MUST respond with a single JSON object and nothing else. Use exactly this shape:
{
  "marks": <number between 0 and maxMarks>,
  "reasoning": "<one or two short sentences explaining the mark>",
  "extractedFromImage": "<what you actually read from the photo — be specific>",
  "confidence": "high" | "medium" | "low"
}

Use "low" confidence when the image is unclear, the handwriting is hard to read, or the answer is ambiguous.`;

  const userText = `Question: ${question}

Maximum marks: ${maxMarks}

Expected answer:
${expectedAnswer}

${body.markingNotes ? `Marking notes from the teacher:\n${body.markingNotes}\n` : ""}${studentAnswer.trim().length > 0
      ? `Student's typed/text answer (may be incomplete or empty if they only submitted a photo):\n${studentAnswer}\n`
      : `The student did NOT provide any typed answer — you must grade based entirely on the photo.\n`
    }

Now look at the attached image of the student's handwritten work and respond with ONLY the JSON object.`;

  // 5. Build the multimodal message
  const userContent: ContentPart[] = [
    { type: "text", text: userText },
    {
      type: "image_url",
      image_url: { url: imageUrl, detail: "high" },
    },
  ];

  try {
    const result = await chatJson<{
      marks: number;
      reasoning: string;
      extractedFromImage?: string;
      confidence?: "high" | "medium" | "low";
    }>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { temperature: 0.2, maxTokens: 800, useVisionConfig: true },
    );

    const clampedMarks = Math.max(
      0,
      Math.min(maxMarks, Number(result.marks) || 0),
    );

    const resp: GradeResponse = {
      marks: clampedMarks,
      maxMarks,
      reasoning: result.reasoning || "No reasoning returned.",
      extractedFromImage:
        result.extractedFromImage ?? "(vision model did not report what it read)",
      confidence: result.confidence ?? "medium",
    };
    return NextResponse.json(resp);
  } catch (err) {
    if (err instanceof AIError) {
      console.error("[grade/equation] Vision error:", err.message, err.body);
      return NextResponse.json(
        { error: "Vision marking failed", detail: err.message },
        { status: 502 },
      );
    }
    console.error("[grade/equation] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error during vision marking" },
      { status: 500 },
    );
  }
}
