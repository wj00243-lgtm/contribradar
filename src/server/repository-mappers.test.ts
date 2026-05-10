import { describe, expect, it } from "vitest";

import { mapIssueRecord, mapRepositoryRecord } from "./repository-mappers";

describe("repository mappers", () => {
  it("maps a Prisma-like repository record into RepoWithScore", () => {
    const repo = mapRepositoryRecord({
      id: "repo_1",
      githubId: "123",
      fullName: "acme/tooling",
      owner: "acme",
      name: "tooling",
      description: "Developer tooling",
      language: "TypeScript",
      topics: ["cli", "tooling"],
      stars: 100,
      forks: 12,
      openIssues: 4,
      license: "MIT",
      contributorCount: 20,
      sizeKb: 1200,
      lastCommitAt: new Date("2026-05-01T00:00:00Z"),
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2026-05-02T00:00:00Z"),
      readinessScore: { toNumber: () => 87 },
      scoreConfidence: { toNumber: () => 82 },
      metricMaintainerResponseHours: { toNumber: () => 8 },
      metricNewcomerFriendlyScore: { toNumber: () => 90 },
      metricCodeHealthScore: { toNumber: () => 80 },
      metricCommunityActivityScore: { toNumber: () => 84 },
      metricDocumentationScore: { toNumber: () => 88 },
      issues: [{ state: "open", labels: ["good first issue"] }]
    });

    expect(repo).toMatchObject({
      id: "repo_1",
      fullName: "acme/tooling",
      license: "MIT",
      contributorCount: 20,
      hasGoodFirstIssue: true,
      readiness: {
        score: 87,
        confidence: 82
      },
      metrics: {
        maintainerResponseHours: 8
      }
    });
    expect(repo.lastCommitAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("maps a Prisma-like issue record into IssueWithScore", () => {
    const issue = mapIssueRecord({
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
      issueReadinessScore: { toNumber: () => 91 },
      hasAcceptanceCriteria: true,
      commentCount: 3,
      lastCommentAt: new Date("2026-05-03T00:00:00Z"),
      firstResponseHours: { toNumber: () => 4 },
      isStale: false
    });

    expect(issue).toMatchObject({
      id: "issue_1",
      repoId: "repo_1",
      labels: ["documentation"],
      readiness: {
        score: 91
      },
      difficulty: "easy"
    });
    expect(issue.lastCommentAt).toBe("2026-05-03T00:00:00.000Z");
  });
});
