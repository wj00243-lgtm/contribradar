const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_TIMEOUT_MS = 15_000;

type Fetcher = typeof fetch;

type GenerateJsonOptions = {
  apiKey?: string;
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  fetcher?: Fetcher;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigurationError";
  }
}

export class GeminiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiResponseError";
  }
}

export async function generateJsonWithGemini<T>({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  timeoutMs = DEFAULT_GEMINI_TIMEOUT_MS,
  fetcher = fetch
}: GenerateJsonOptions): Promise<T> {
  if (!apiKey) {
    throw new GeminiConfigurationError("GEMINI_API_KEY is required to generate AI recommendations.");
  }

  let response: Response;

  try {
    response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature,
            responseMimeType: "application/json"
          }
        })
      }
    );
  } catch {
    throw new GeminiResponseError("Gemini request failed before receiving a response.");
  }

  if (!response.ok) {
    throw new GeminiResponseError(`Gemini request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const content = payload.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;

  if (!content) {
    throw new GeminiResponseError("Gemini response did not include text content.");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new GeminiResponseError("Gemini response content was not valid JSON.");
  }
}
