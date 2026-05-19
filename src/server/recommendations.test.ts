import { describe, expect, it, vi } from "vitest";

import {
  buildRecommendationContext,
  generateAiRepoRecommendations,
  RecommendationQuotaError,
  RecommendationPlanError
} from "./recommendations";

function createClient(overrides: Partial<ReturnType<typeof baseClient>> = {}) {
  return {
    ...baseClient(),
    ...overrides
  };
}

function baseClient() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "user_1",
        plan: "pro",
        skillVector: { languages: ["TypeScript"], topics: ["cli"] },
        experienceLevel: "beginner",
        weeklyHours: 5
      })
    },
    contribution: {
      findMany: vi.fn().mockResolvedValue([
        {
          type: "issue_comment",
          status: "open",
          repository: {
            fullName: "acme/tooling",
            language: "TypeScript",
            topics: ["cli"]
          }
        }
      ])
    },
    watchlist: {
      findMany: vi.fn().mockResolvedValue([
        {
          repos: [
            {
              repository: {
                id: "repo_watch",
                fullName: "acme/watch",
                language: "TypeScript",
                topics: ["developer-tools"],
                readinessScore: 82,
                stars: 1200,
                openIssues: 12,
                description: "Watchlisted repo"
              }
            }
          ]
        }
      ])
    },
    repository: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "repo_1",
          fullName: "acme/recommended",
          language: "TypeScript",
          topics: ["cli", "developer-tools"],
          readinessScore: 91,
          stars: 2400,
          openIssues: 21,
          description: "Great first contribution target"
        }
      ])
    },
    usageLog: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    userSettings: {
      findUnique: vi.fn().mockResolvedValue({ aiQuota: 20 })
    }
  };
}

describe("buildRecommendationContext", () => {
  it("combines skills, contribution history, watchlists, and candidate repositories", async () => {
    const context = await buildRecommendationContext(createClient(), "user_1");

    expect(context.user.languages).toEqual(["TypeScript"]);
    expect(context.user.topics).toEqual(["cli"]);
    expect(context.contributions).toEqual([
      {
        repo: "acme/tooling",
        language: "TypeScript",
        topics: ["cli"],
        type: "issue_comment",
        status: "open"
      }
    ]);
    expect(context.watchlistedRepos).toEqual([
      {
        repoId: "repo_watch",
        fullName: "acme/watch",
        language: "TypeScript",
        topics: ["developer-tools"],
        readinessScore: 82
      }
    ]);
    expect(context.candidates[0]).toMatchObject({
      repoId: "repo_1",
      fullName: "acme/recommended",
      language: "TypeScript",
      readinessScore: 91
    });
  });
});

describe("generateAiRepoRecommendations", () => {
  it("blocks users without the pro AI recommendations feature", async () => {
    const client = createClient({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user_1",
          plan: "free",
          skillVector: { languages: ["TypeScript"], topics: ["cli"] },
          experienceLevel: "beginner",
          weeklyHours: 5
        })
      }
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator: vi.fn()
      })
    ).rejects.toBeInstanceOf(RecommendationPlanError);
  });

  it("blocks users who have exhausted their monthly recommendation quota", async () => {
    const client = createClient({
      usageLog: {
        findUnique: vi.fn().mockResolvedValue({ count: 20 }),
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ aiQuota: 20 })
      }
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator: vi.fn()
      })
    ).rejects.toBeInstanceOf(RecommendationQuotaError);
    expect(client.usageLog.updateMany).not.toHaveBeenCalled();
    expect(client.usageLog.create).not.toHaveBeenCalled();
  });

  it("generates recommendations and consumes usage successfully", async () => {
    const client = createClient();
    const generator = vi.fn().mockResolvedValue({
      recommendations: [
        {
          repoId: "repo_1",
          fullName: "acme/recommended",
          fitScore: 94,
          reason: "Matches TypeScript and CLI history.",
          suggestedIssueSearch: "good first issue cli"
        }
      ]
    });

    const result = await generateAiRepoRecommendations(client, "user_1", {
      apiKey: "test-key",
      generator
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.usage.used).toBe(1);
    expect(client.usageLog.create).toHaveBeenCalledOnce(); // called because findUnique returns null
    expect(generator).toHaveBeenCalledWith(expect.objectContaining({ candidates: expect.any(Array) }), expect.objectContaining({ apiKey: "test-key" }));
  });

  it("refunds quota when the AI generator fails", async () => {
    const client = createClient();
    const generator = vi.fn().mockRejectedValue(new Error("Gemini timeout"));

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator
      })
    ).rejects.toThrow("Gemini timeout");

    expect(client.usageLog.create).toHaveBeenCalledOnce(); // it was consumed
    expect(client.usageLog.updateMany).toHaveBeenCalledOnce(); // it was refunded via updateMany with decrement
  });

  it("throws when recommendation is missing repoId", async () => {
    const client = createClient();
    const generator = vi.fn().mockResolvedValue({
      recommendations: [
        {
          fullName: "acme/repo",
          fitScore: 90,
          reason: "Good fit",
          suggestedIssueSearch: "good first issue"
        }
      ]
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator
      })
    ).rejects.toThrow("repoId is required");

    // Verify quota was refunded since validation failed
    expect(client.usageLog.updateMany).toHaveBeenCalled();
  });

  it("throws when fitScore is not a valid number", async () => {
    const client = createClient();
    const generator = vi.fn().mockResolvedValue({
      recommendations: [
        {
          repoId: "repo_1",
          fullName: "acme/repo",
          fitScore: "high",
          reason: "Good fit",
          suggestedIssueSearch: "good first issue"
        }
      ]
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator
      })
    ).rejects.toThrow("fitScore must be a number between 0 and 100");

    expect(client.usageLog.updateMany).toHaveBeenCalled();
  });

  it("throws when fitScore is out of valid range", async () => {
    const client = createClient();
    const generator = vi.fn().mockResolvedValue({
      recommendations: [
        {
          repoId: "repo_1",
          fullName: "acme/repo",
          fitScore: 150,
          reason: "Good fit",
          suggestedIssueSearch: "good first issue"
        }
      ]
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator
      })
    ).rejects.toThrow("fitScore must be a number between 0 and 100");

    expect(client.usageLog.updateMany).toHaveBeenCalled();
  });

  it("throws when recommendation is missing reason", async () => {
    const client = createClient();
    const generator = vi.fn().mockResolvedValue({
      recommendations: [
        {
          repoId: "repo_1",
          fullName: "acme/repo",
          fitScore: 90,
          suggestedIssueSearch: "good first issue"
        }
      ]
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator
      })
    ).rejects.toThrow("reason is required");

    expect(client.usageLog.updateMany).toHaveBeenCalled();
  });

  it("throws when recommendations array is empty", async () => {
    const client = createClient();
    const generator = vi.fn().mockResolvedValue({
      recommendations: []
    });

    await expect(
      generateAiRepoRecommendations(client, "user_1", {
        apiKey: "test-key",
        generator
      })
    ).rejects.toThrow("recommendations array must not be empty");

    expect(client.usageLog.updateMany).toHaveBeenCalled();
  });
});
