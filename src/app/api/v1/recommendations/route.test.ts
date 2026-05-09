import { describe, expect, it, vi } from "vitest";

import { createRecommendationsPostHandler } from "./route-handler";
import { RecommendationPlanError, RecommendationQuotaError } from "@/server/recommendations";
import { OpenAiConfigurationError, OpenAiResponseError } from "@/server/openai";

function request() {
  return new Request("http://localhost/api/v1/recommendations", { method: "POST" });
}

describe("POST /api/v1/recommendations", () => {
  it("returns 401 when no session is present", async () => {
    const POST = createRecommendationsPostHandler({
      auth: vi.fn().mockResolvedValue(null),
      client: {},
      apiKey: "test-key",
      generateRecommendations: vi.fn()
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED" }
    });
  });

  it("returns 403 for non-pro plans", async () => {
    const POST = createRecommendationsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "free" } }),
      client: {},
      apiKey: "test-key",
      generateRecommendations: vi.fn().mockRejectedValue(new RecommendationPlanError("Pro required"))
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PRO_FEATURE_REQUIRED" }
    });
  });

  it("returns 429 when the monthly recommendation quota is exhausted", async () => {
    const POST = createRecommendationsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "pro" } }),
      client: {},
      apiKey: "test-key",
      generateRecommendations: vi.fn().mockRejectedValue(new RecommendationQuotaError("Quota exhausted"))
    });

    const response = await POST(request());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AI_RECOMMENDATION_QUOTA_EXHAUSTED" }
    });
  });

  it("returns 503 when OpenAI is not configured", async () => {
    const POST = createRecommendationsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "pro" } }),
      client: {},
      apiKey: "",
      generateRecommendations: vi.fn().mockRejectedValue(new OpenAiConfigurationError("Missing key"))
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "OPENAI_NOT_CONFIGURED" }
    });
  });

  it("returns 502 when OpenAI returns unusable output", async () => {
    const POST = createRecommendationsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "pro" } }),
      client: {},
      apiKey: "test-key",
      generateRecommendations: vi.fn().mockRejectedValue(new OpenAiResponseError("Bad JSON"))
    });

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "OPENAI_RESPONSE_INVALID" }
    });
  });

  it("returns recommendations and usage for pro users", async () => {
    const generateRecommendations = vi.fn().mockResolvedValue({
      recommendations: [
        {
          repoId: "repo_1",
          fullName: "acme/recommended",
          fitScore: 94,
          reason: "Matches TypeScript and CLI history.",
          suggestedIssueSearch: "good first issue cli"
        }
      ],
      usage: {
        used: 1,
        limit: 20,
        remaining: 19,
        period: "2026-05"
      }
    });
    const POST = createRecommendationsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "pro" } }),
      client: { marker: "client" },
      apiKey: "test-key",
      generateRecommendations
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recommendations: [
        {
          repoId: "repo_1",
          fullName: "acme/recommended",
          fitScore: 94,
          reason: "Matches TypeScript and CLI history.",
          suggestedIssueSearch: "good first issue cli"
        }
      ],
      usage: {
        used: 1,
        limit: 20,
        remaining: 19,
        period: "2026-05"
      }
    });
    expect(generateRecommendations).toHaveBeenCalledWith({ marker: "client" }, "user_1", {
      apiKey: "test-key"
    });
  });
});
