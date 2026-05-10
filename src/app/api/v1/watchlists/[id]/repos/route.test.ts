import { describe, expect, it, vi } from "vitest";

import type { RepoWithScore, Watchlist } from "@/domain/types";
import { createWatchlistReposGetHandler } from "./route-handler";

const watchlist: Watchlist = {
  id: "watchlist_1",
  userId: "user_session",
  name: "React shortlist",
  description: "Repos for frontend contributions",
  filters: {
    languages: ["TypeScript"],
    topics: ["react"],
    minScore: 70,
    hasGoodFirstIssue: true
  },
  alertEnabled: true,
  digestFrequency: "weekly",
  repoIds: ["repo_1"],
  createdAt: "2026-05-10T00:00:00.000Z"
};

const repo: RepoWithScore = {
  id: "repo_1",
  githubId: "1",
  fullName: "open/source",
  owner: "open",
  name: "source",
  description: "A repo",
  language: "TypeScript",
  topics: ["react"],
  stars: 100,
  forks: 10,
  openIssues: 5,
  license: "MIT",
  contributorCount: 12,
  sizeKb: 1000,
  lastCommitAt: "2026-05-10T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
  metrics: {
    maintainerResponseHours: 12,
    hasContributingGuide: true,
    hasIssueTemplates: true,
    hasGoodFirstIssueLabel: true,
    averagePrMergeDays: 3,
    ciPassRate: 95,
    testCoveragePercent: 80,
    openCriticalBugs: 0,
    hasCodeOfConduct: true,
    commitsPerDay: 2,
    activeContributors30d: 6,
    readmeLength: 1000,
    hasChangelog: true,
    hasApiDocs: true,
    hasExamples: true
  },
  readiness: {
    score: 90,
    confidence: 80,
    breakdown: [],
    explanation: "Ready",
    warnings: []
  },
  hasGoodFirstIssue: true
};

function context(id = "watchlist_1") {
  return {
    params: Promise.resolve({ id })
  };
}

describe("GET /api/v1/watchlists/[id]/repos", () => {
  it("rejects anonymous watchlist repo reads", async () => {
    const getWatchlistRepos = vi.fn();
    const GET = createWatchlistReposGetHandler({
      auth: async () => null,
      client: {},
      getWatchlistRepos
    });

    const response = await GET(new Request("http://localhost/api/v1/watchlists/watchlist_1/repos"), context());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
    expect(getWatchlistRepos).not.toHaveBeenCalled();
  });

  it("loads repos through Prisma with the session user id", async () => {
    const getWatchlistRepos = vi.fn(async () => ({
      status: 200 as const,
      data: {
        watchlist,
        repos: [repo],
        total: 1,
        filters_applied: watchlist.filters
      }
    }));
    const GET = createWatchlistReposGetHandler({
      auth: async () => ({
        user: {
          id: "user_session",
          plan: "pro"
        }
      }),
      client: { watchlist: {} },
      getWatchlistRepos
    });

    const response = await GET(new Request("http://localhost/api/v1/watchlists/watchlist_1/repos"), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(getWatchlistRepos).toHaveBeenCalledWith({ watchlist: {} }, "watchlist_1", "user_session");
  });

  it("maps missing watchlists to 404", async () => {
    const GET = createWatchlistReposGetHandler({
      auth: async () => ({
        user: {
          id: "user_session",
          plan: "free"
        }
      }),
      client: {},
      getWatchlistRepos: async () => ({
        status: 404 as const,
        error: {
          code: "WATCHLIST_NOT_FOUND" as const,
          message: "Watchlist watchlist_1 was not found."
        }
      })
    });

    const response = await GET(new Request("http://localhost/api/v1/watchlists/watchlist_1/repos"), context());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("WATCHLIST_NOT_FOUND");
  });
});
