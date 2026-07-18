/**
 * Generic OpenAI-compatible chat client.
 *
 * Works with MiniMax / OpenAI / Groq / any provider that exposes the
 * standard /chat/completions endpoint. Configure via env vars.
 *
 * For MiniMax specifically, set:
 *   MINIMAX_API_KEY=<your key>
 *   MINIMAX_BASE_URL=https://api.minimax.chat/v1
 *   MINIMAX_MODEL=minimax-m3
 *
 * For OpenAI:
 *   MINIMAX_API_KEY=<your key>
 *   MINIMAX_BASE_URL=https://api.openai.com/v1
 *   MINIMAX_MODEL=gpt-4o-mini
 *
 * For Groq:
 *   MINIMAX_API_KEY=<your key>
 *   MINIMAX_BASE_URL=https://api.groq.com/openai/v1
 *   MINIMAX_MODEL=llama-3.3-70b-versatile
 *
 * For Gemini (OpenAI-compatible endpoint):
 *   MINIMAX_API_KEY=<your key>
 *   MINIMAX_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *   MINIMAX_MODEL=gemini-2.0-flash
 *
 * For VISION (separate config to use a different model for image inputs):
 *   VISION_API_KEY=<your key>
 *   VISION_BASE_URL=<see above>
 *   VISION_MODEL=gemini-2.0-flash | gpt-4o-mini | ...
 */

export type TextContent = { type: "text"; text: string };
export type ImageUrlContent = {
  type: "image_url";
  image_url: { url: string; detail?: "low" | "high" | "auto" };
};

export type ContentPart = TextContent | ImageUrlContent;

export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "user"; content: ContentPart[] };

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  /** Use the VISION_* env vars instead of MINIMAX_* */
  useVisionConfig?: boolean;
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

function loadConfig(useVision: boolean) {
  const prefix = useVision ? "VISION_" : "MINIMAX_";
  const apiKey = process.env[`${prefix}API_KEY`];
  const baseUrl = process.env[`${prefix}BASE_URL`];
  const model = process.env[`${prefix}MODEL`];
  return { apiKey, baseUrl, model };
}

export function isAIConfigured(opts: { vision?: boolean } = {}): boolean {
  const cfg = loadConfig(opts.vision ?? false);
  return Boolean(cfg.apiKey && cfg.baseUrl && cfg.model);
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const cfg = loadConfig(options.useVisionConfig ?? false);
  const apiKey = cfg.apiKey;
  const baseUrl = cfg.baseUrl;
  const model = options.model ?? cfg.model;

  if (!apiKey || !baseUrl || !model) {
    const prefix = options.useVisionConfig ? "VISION_" : "MINIMAX_";
    throw new AIError(
      `AI not configured. Set ${prefix}API_KEY, ${prefix}BASE_URL, and ${prefix}MODEL in .env.local.`,
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
