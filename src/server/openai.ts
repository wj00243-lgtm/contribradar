const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type Fetcher = typeof fetch;

type GenerateJsonOptions = {
  apiKey?: string;
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  fetcher?: Fetcher;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export class OpenAiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiConfigurationError";
  }
}

export class OpenAiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiResponseError";
  }
}

export async function generateJsonWithOpenAi<T>({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  fetcher = fetch
}: GenerateJsonOptions): Promise<T> {
  if (!apiKey) {
    throw new OpenAiConfigurationError("OPENAI_API_KEY is required to generate AI recommendations.");
  }

  const response = await fetcher(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new OpenAiResponseError(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new OpenAiResponseError("OpenAI response did not include message content.");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new OpenAiResponseError("OpenAI response content was not valid JSON.");
  }
}
