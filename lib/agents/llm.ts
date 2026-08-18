// LLM access, provider-isolated. Everything else calls generateJSON and never
// touches the provider directly — swapping models/providers is a one-file change.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// llama-3.3-70b-versatile was retired from Groq (404 model_not_found as of
// this check) — openai/gpt-oss-120b confirmed live and JSON-mode compatible.
export const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Ask the model for a single JSON object. The `_schema` argument documents the
// expected shape at the call site; JSON-mode + an explicit shape in the prompt
// is what actually constrains the output. Transient errors retry with backoff.
export async function generateJSON<T>(
  prompt: string,
  _schema: unknown,
  { temperature = 0.2, retries = 3 }: { temperature?: number; retries?: number } = {},
): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY not set — get a free key at https://console.groq.com/keys and add it to .env.local",
    );
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a precise assistant. Respond with a single valid JSON object matching the shape the user requests. Output only JSON — no prose, no markdown fences.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await sleep(700 * 2 ** attempt);
        continue;
      }
      throw e;
    }

    if (!res.ok) {
      const body = await res.text();
      // Retry transient errors, plus Groq's occasional json_validate_failed
      // (the model sometimes emits invalid JSON — a re-roll usually fixes it).
      const transient =
        res.status === 429 ||
        res.status >= 500 ||
        (res.status === 400 && body.includes("json_validate_failed"));
      if (transient && attempt < retries) {
        await sleep(700 * 2 ** attempt);
        continue;
      }
      throw new Error(`LLM error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(text) as T;
    } catch {
      if (attempt < retries) {
        await sleep(700 * 2 ** attempt);
        continue;
      }
      throw new Error("LLM returned invalid JSON");
    }
  }
  throw lastErr ?? new Error("LLM request failed");
}
