/**
 * Generic OpenAI-compatible chat client.
 *
 * Works with MiniMax / OpenAI / Groq / any provider that exposes the
 * standard /chat/completions endpoint. Configure via env vars.
 *
 * For MiniMax specifically, set:
 *   MINIMAX_BASE_URL=https://api.minimax.chat/v1
 *   MINIMAX_MODEL=minimax-m3
 *   MINIMAX_API_KEY=<your key>
 *
 * For OpenAI:
 *   MINIMAX_BASE_URL=https://api.openai.com/v1
 *   MINIMAX_MODEL=gpt-4o-mini
 *
 * For Groq:
 *   MINIMAX_BASE_URL=https://api.groq.com/openai/v1
 *   MINIMAX_MODEL=llama-3.3-70b-versatile
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
};

export class AIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function isAIConfigured(): boolean {
  return Boolean(
    process.env.MINIMAX_API_KEY && process.env.MINIMAX_BASE_URL && process.env.MINIMAX_MODEL,
  );
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.MINIMAX_BASE_URL;
  const model = options.model ?? process.env.MINIMAX_MODEL;

  if (!apiKey || !baseUrl || !model) {
    throw new AIError(
      "AI not configured. Set MINIMAX_API_KEY, MINIMAX_BASE_URL, and MINIMAX_MODEL in .env.local.",
    );
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1024,
  };

  if (options.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    // 30s timeout — AI marking should be quick
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AIError(
      `AI request failed: ${res.status} ${res.statusText}`,
      res.status,
      text,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIError("AI response had no content");
  }

  return content;
}

/**
 * Helper: ask the model to reply with strict JSON matching a schema.
 * Strips markdown code fences if the model wraps the JSON in ```json ... ```.
 */
export async function chatJson<T>(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<T> {
  const raw = await chat(messages, { ...options, responseFormat: "json" });
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new AIError(
      `AI returned invalid JSON: ${cleaned.slice(0, 200)}`,
    );
  }
}
