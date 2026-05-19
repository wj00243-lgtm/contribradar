import { describe, expect, it, vi } from "vitest";

import { GeminiConfigurationError, GeminiResponseError, generateJsonWithGemini } from "./gemini";

describe("generateJsonWithGemini", () => {
  it("sends a JSON-only generateContent request with the default Flash model", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({ recommendations: [{ repoId: "repo_1", fitScore: 91 }] })
                  }
                ]
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    const result = await generateJsonWithGemini<{ recommendations: Array<{ repoId: string; fitScore: number }> }>({
      apiKey: "test-key",
      systemPrompt: "Return JSON only.",
      userPrompt: "Recommend repos.",
      fetcher
    });

    expect(result).toEqual({ recommendations: [{ repoId: "repo_1", fitScore: 91 }] });
    expect(fetcher).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "test-key"
        },
        body: expect.any(String)
      })
    );
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.contents[0].parts[0].text).toBe("Recommend repos.");
  });

  it("allows the Gemini request timeout to be configured", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 })
    );

    await generateJsonWithGemini({
      apiKey: "test-key",
      systemPrompt: "Return JSON only.",
      userPrompt: "Recommend repos.",
      fetcher,
      timeoutMs: 2500
    });

    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("fails before network access when the api key is missing", async () => {
    await expect(
      generateJsonWithGemini({
        apiKey: "",
        systemPrompt: "Return JSON only.",
        userPrompt: "Recommend repos.",
        fetcher: vi.fn()
      })
    ).rejects.toBeInstanceOf(GeminiConfigurationError);
  });

  it("wraps invalid JSON responses as GeminiResponseError", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }), { status: 200 })
    );

    await expect(
      generateJsonWithGemini({
        apiKey: "test-key",
        systemPrompt: "Return JSON only.",
        userPrompt: "Recommend repos.",
        fetcher
    })
    ).rejects.toBeInstanceOf(GeminiResponseError);
  });

  it("wraps unreadable success payloads as GeminiResponseError", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("bad body");
      }
    } as unknown as Response);

    await expect(
      generateJsonWithGemini({
        apiKey: "test-key",
        systemPrompt: "Return JSON only.",
        userPrompt: "Recommend repos.",
        fetcher
      })
    ).rejects.toMatchObject({
      name: "GeminiResponseError",
      message: "Gemini response payload was not readable."
    });
  });

  it("wraps network and timeout failures as GeminiResponseError", async () => {
    const fetcher = vi.fn().mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));

    await expect(
      generateJsonWithGemini({
        apiKey: "test-key",
        systemPrompt: "Return JSON only.",
        userPrompt: "Recommend repos.",
        fetcher
      })
    ).rejects.toMatchObject({
      name: "GeminiResponseError",
      message: "Gemini request failed before receiving a response."
    });
  });
});
