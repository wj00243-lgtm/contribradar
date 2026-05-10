import { describe, expect, it, vi } from "vitest";

import { discoverIssuesFromDb, discoverRepositoriesFromDb, getRepositoryScoreFromDb } from "./discovery-db";

function repository(overrides = {}) {
  return {
    id: "repo_1",
    githubId: "1",
    fullName: "acme/tooling",
    owner: "acme",
    name: "tooling",
    description: "Tooling",
    language: "TypeScript",
    topics: ["cli"],
    stars: 100,
    forks: 10,
    openIssues: 3,
    license: "MIT",
    contributorCount: 10,
    sizeKb: 1000,
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
    issues: [{ state: "open", labels: ["good first issue"] }],
    ...overrides
  };
}

describe("discoverRepositoriesFromDb", () => {
  it("queries Prisma with filters and maps repository results", async () => {
    const findMany = vi.fn().mockResolvedValue([repository()]);
    const count = vi.fn().mockResolvedValue(1);
    const client = {
      repository: {
        findMany,
        count
      }
    };

    const result = await discoverRepositoriesFromDb(client, {
      language: "TypeScript",
      topics: ["cli"],
      minScore: 70,
      hasGoodFirstIssue: true,
      lastActiveWithinDays: 30,
      sort: "score",
      page: 1,
      limit: 10
    });

    expect(result.total).toBe(1);
    expect(result.repos[0].fullName).toBe("acme/tooling");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10, skip: 0 }));
    expect(count).toHaveBeenCalledOnce();
  });
});

describe("getRepositoryScoreFromDb", () => {
  it("returns repository score by owner and name", async () => {
    const client = {
      repository: {
        findFirst: vi.fn().mockResolvedValue(repository())
      }
    };

    const result = await getRepositoryScoreFromDb(client, "acme", "tooling");

    expect(result.status).toBe(200);
    expect(result.data?.repository.fullName).toBe("acme/tooling");
    expect(result.data?.readiness_score).toBe(88);
  });

  it("returns not found when the repository is missing", async () => {
    const client = {
      repository: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };

    await expect(getRepositoryScoreFromDb(client, "missing", "repo")).resolves.toMatchObject({
      status: 404,
      error: { code: "REPOSITORY_NOT_FOUND" }
    });
  });
});

describe("discoverIssuesFromDb", () => {
  it("queries Prisma with issue filters and maps issue results", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "issue_1",
        repoId: "repo_1",
        githubId: "456",
        number: 12,
        title: "Improve docs",
        body: "Add a detailed docs example.",
        state: "open",
        labels: ["documentation"],
        assignees: [],
        createdAt: new Date("2026-05-01T00:00:00Z"),
        updatedAt: new Date("2026-05-02T00:00:00Z"),
        closedAt: null,
        issueReadinessScore: 91,
        hasAcceptanceCriteria: true,
        commentCount: 3,
        lastCommentAt: new Date("2026-05-03T00:00:00Z"),
        firstResponseHours: 4,
        isStale: false
      }
    ]);
    const count = vi.fn().mockResolvedValue(1);
    const client = {
      issue: {
        findMany,
        count
      }
    };

    const result = await discoverIssuesFromDb(client, {
      repoId: "repo_1",
      labels: ["documentation"],
      minIssueScore: 80,
      isStale: false,
      hasNoAssignee: true,
      difficulty: "easy",
      page: 1,
      limit: 10
    });

    expect(result.total).toBe(1);
    expect(result.issues[0].id).toBe("issue_1");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10, skip: 0 }));
    expect(count).toHaveBeenCalledOnce();
  });
});
