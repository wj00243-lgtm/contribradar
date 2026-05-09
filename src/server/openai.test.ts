import { describe, expect, it, vi } from "vitest";

import { generateJsonWithOpenAi, OpenAiConfigurationError, OpenAiResponseError } from "./openai";

describe("generateJsonWithOpenAi", () => {
  it("sends a JSON-only chat completion request with the default low-cost model", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ recommendations: [{ repoId: "repo_1", fitScore: 91 }] })
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    const result = await generateJsonWithOpenAi<{ recommendations: Array<{ repoId: string; fitScore: number }> }>({
      apiKey: "test-key",
      systemPrompt: "Return JSON only.",
      userPrompt: "Recommend repos.",
      fetcher
    });

    expect(result).toEqual({ recommendations: [{ repoId: "repo_1", fitScore: 91 }] });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        },
        body: expect.any(String)
      })
    );
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("fails before network access when the api key is missing", async () => {
    await expect(
      generateJsonWithOpenAi({
        apiKey: "",
        systemPrompt: "Return JSON only.",
        userPrompt: "Recommend repos.",
        fetcher: vi.fn()
      })
    ).rejects.toBeInstanceOf(OpenAiConfigurationError);
  });

  it("wraps invalid JSON responses as OpenAiResponseError", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 })
    );

    await expect(
      generateJsonWithOpenAi({
        apiKey: "test-key",
        systemPrompt: "Return JSON only.",
        userPrompt: "Recommend repos.",
        fetcher
      })
    ).rejects.toBeInstanceOf(OpenAiResponseError);
  });
});
