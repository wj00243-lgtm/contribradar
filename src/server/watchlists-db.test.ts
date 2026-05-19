import { describe, expect, it, vi } from "vitest";

import { createWatchlistInDb, getWatchlistReposFromDb } from "./watchlists-db";

function repository(id: string) {
  return {
    id,
    githubId: id,
    fullName: `acme/${id}`,
    owner: "acme",
    name: id,
    description: "Repo",
    language: "TypeScript",
    topics: ["cli"],
    stars: 10,
    forks: 1,
    openIssues: 2,
    license: "MIT",
    contributorCount: 12,
    sizeKb: 100,
    lastCommitAt: new Date("2026-05-01T00:00:00Z"),
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2026-05-02T00:00:00Z"),
    readinessScore: 88,
    scoreConfidence: 80,
    metricMaintainerResponseHours: 8,
    metricNewcomerFriendlyScore: 90,
    metricCodeHealthScore: 82,
    metricCommunityActivityScore: 84,
    metricDocumentationScore: 88,
    issues: []
  };
}

describe("createWatchlistInDb", () => {
  it("creates a watchlist and join rows with the free repo cap", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "watchlist_1",
      userId: "user_1",
      name: "Targets",
      description: "",
      filters: { languages: [], topics: [], minScore: 0, hasGoodFirstIssue: false },
      alertEnabled: false,
      digestFrequency: "weekly",
      createdAt: new Date("2026-05-10T00:00:00Z"),
      repos: Array.from({ length: 20 }, (_, index) => ({ repoId: `repo_${index}` }))
    });
    const client = {
      watchlist: {
        count: vi.fn().mockResolvedValue(0),
        create
      },
      repository: {
        findMany: vi.fn().mockResolvedValue(Array.from({ length: 25 }, (_, index) => ({ id: `repo_${index}` })))
      }
    };

    const result = await createWatchlistInDb(client, {
      userId: "user_1",
      userPlan: "free",
      name: "Targets",
      description: "",
      filters: { languages: [], topics: [], minScore: 0 },
      alertEnabled: false,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(201);
    expect(result.data?.watchlist.repoIds).toHaveLength(20);
    expect(create.mock.calls[0][0].data.repos.create).toHaveLength(20);
  });

  it("blocks a fourth free watchlist", async () => {
    const client = {
      watchlist: {
        count: vi.fn().mockResolvedValue(3),
        create: vi.fn()
      },
      repository: {
        findMany: vi.fn()
      }
    };

    const result = await createWatchlistInDb(client, {
      userId: "user_1",
      userPlan: "free",
      name: "Targets",
      description: "",
      filters: { languages: [], topics: [], minScore: 0 },
      alertEnabled: false,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(403);
    expect(result.error?.code).toBe("FREE_WATCHLIST_LIMIT_REACHED");
  });

  it("normalizes malformed filter JSON before querying repositories", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "watchlist_1",
      userId: "user_1",
      name: "Targets",
      description: "",
      filters: {
        languages: ["TypeScript"],
        topics: ["cli"],
        minScore: 100,
        hasGoodFirstIssue: true
      },
      alertEnabled: false,
      digestFrequency: "weekly",
      createdAt: new Date("2026-05-10T00:00:00Z"),
      repos: []
    });
    const findMany = vi.fn().mockResolvedValue([]);
    const client = {
      watchlist: {
        count: vi.fn().mockResolvedValue(0),
        create
      },
      repository: {
        findMany
      }
    };

    await createWatchlistInDb(client, {
      userId: "user_1",
      userPlan: "pro",
      name: "Targets",
      description: "",
      filters: {
        languages: [" TypeScript ", "", "TypeScript", 42] as unknown as string[],
        topics: [" cli ", "cli", null] as unknown as string[],
        minScore: 150,
        hasGoodFirstIssue: true
      },
      alertEnabled: false,
      digestFrequency: "weekly"
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        language: { in: ["TypeScript"] },
        AND: [{ topics: { array_contains: "cli" } }],
        readinessScore: { gte: 100 },
        issues: { some: { state: "open", labels: { array_contains: "good first issue" } } }
      }
    }));
    expect(create.mock.calls[0][0].data.filters).toEqual({
      languages: ["TypeScript"],
      topics: ["cli"],
      minScore: 100,
      hasGoodFirstIssue: true
    });
  });
});

describe("getWatchlistReposFromDb", () => {
  it("returns a watchlist with mapped repositories", async () => {
    const client = {
      watchlist: {
        findFirst: vi.fn().mockResolvedValue({
          id: "watchlist_1",
          userId: "user_1",
          name: "Targets",
          description: "",
          filters: { languages: [], topics: [], minScore: 0, hasGoodFirstIssue: false },
          alertEnabled: false,
          digestFrequency: "weekly",
          createdAt: new Date("2026-05-10T00:00:00Z"),
          repos: [{ repoId: "repo_1", repository: repository("repo_1") }]
        })
      }
    };

    const result = await getWatchlistReposFromDb(client, "watchlist_1", "user_1");

    expect(result.status).toBe(200);
    expect(result.data?.repos[0].id).toBe("repo_1");
    expect(result.data?.watchlist.repoIds).toEqual(["repo_1"]);
  });

  it("returns not found for missing watchlists", async () => {
    const client = {
      watchlist: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };

    await expect(getWatchlistReposFromDb(client, "missing", "user_1")).resolves.toMatchObject({
      status: 404,
      error: { code: "WATCHLIST_NOT_FOUND" }
    });
  });

  it("normalizes persisted malformed filter JSON on read", async () => {
    const client = {
      watchlist: {
        findFirst: vi.fn().mockResolvedValue({
          id: "watchlist_1",
          userId: "user_1",
          name: "Targets",
          description: "",
          filters: {
            languages: [" TypeScript ", "TypeScript", false],
            topics: [" cli ", "", "cli"],
            minScore: -25,
            hasGoodFirstIssue: true
          },
          alertEnabled: false,
          digestFrequency: "weekly",
          createdAt: new Date("2026-05-10T00:00:00Z"),
          repos: []
        })
      }
    };

    const result = await getWatchlistReposFromDb(client, "watchlist_1", "user_1");

    expect(result.status).toBe(200);
    expect(result.data?.watchlist.filters).toEqual({
      languages: ["TypeScript"],
      topics: ["cli"],
      minScore: 0,
      hasGoodFirstIssue: true
    });
  });
});
