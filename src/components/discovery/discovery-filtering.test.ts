import { describe, expect, it } from "vitest";
import type { RepoWithScore } from "@/domain/types";
import { filterAndSortRepos, type DiscoveryFilters } from "./discovery-filtering";

function repo(overrides: Partial<RepoWithScore>): RepoWithScore {
  return {
    id: overrides.id ?? "repo",
    githubId: overrides.githubId ?? "1",
    fullName: overrides.fullName ?? "owner/repo",
    owner: overrides.owner ?? "owner",
    name: overrides.name ?? "repo",
    description: overrides.description ?? "Repository",
    language: overrides.language ?? "TypeScript",
    topics: overrides.topics ?? [],
    stars: overrides.stars ?? 0,
    forks: overrides.forks ?? 0,
    openIssues: overrides.openIssues ?? 0,
    license: overrides.license ?? "MIT",
    contributorCount: overrides.contributorCount ?? 10,
    sizeKb: overrides.sizeKb ?? 0,
    lastCommitAt: overrides.lastCommitAt ?? "2026-01-01T00:00:00.000Z",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    readiness: {
      score: overrides.readiness?.score ?? 0,
      confidence: overrides.readiness?.confidence ?? 0,
      breakdown: [],
      explanation: "",
      warnings: []
    },
    hasGoodFirstIssue: overrides.hasGoodFirstIssue ?? false,
    metrics: {
      maintainerResponseHours: overrides.metrics?.maintainerResponseHours ?? null,
      hasContributingGuide: overrides.metrics?.hasContributingGuide ?? false,
      hasIssueTemplates: overrides.metrics?.hasIssueTemplates ?? false,
      hasGoodFirstIssueLabel: overrides.metrics?.hasGoodFirstIssueLabel ?? false,
      averagePrMergeDays: overrides.metrics?.averagePrMergeDays ?? null,
      ciPassRate: overrides.metrics?.ciPassRate ?? null,
      testCoveragePercent: overrides.metrics?.testCoveragePercent ?? null,
      openCriticalBugs: overrides.metrics?.openCriticalBugs ?? 0,
      hasCodeOfConduct: overrides.metrics?.hasCodeOfConduct ?? false,
      commitsPerDay: overrides.metrics?.commitsPerDay ?? 0,
      activeContributors30d: overrides.metrics?.activeContributors30d ?? 0,
      readmeLength: overrides.metrics?.readmeLength ?? 0,
      hasChangelog: overrides.metrics?.hasChangelog ?? false,
      hasApiDocs: overrides.metrics?.hasApiDocs ?? false,
      hasExamples: overrides.metrics?.hasExamples ?? false
    }
  };
}

describe("filterAndSortRepos", () => {
  it("filters by language, minimum score, and good-first-issue availability", () => {
    const filters: DiscoveryFilters = {
      language: "Python",
      minScore: 70,
      sort: "score",
      goodFirstOnly: true,
      license: "",
      lastCommitWithinDays: "",
      minContributors: "",
      maxContributors: ""
    };

    const result = filterAndSortRepos(
      [
        repo({ id: "typescript", language: "TypeScript", readiness: { score: 90 } as RepoWithScore["readiness"], hasGoodFirstIssue: true }),
        repo({ id: "low", language: "Python", readiness: { score: 65 } as RepoWithScore["readiness"], hasGoodFirstIssue: true }),
        repo({ id: "match", language: "Python", readiness: { score: 82 } as RepoWithScore["readiness"], hasGoodFirstIssue: true }),
        repo({ id: "no-gfi", language: "Python", readiness: { score: 88 } as RepoWithScore["readiness"], hasGoodFirstIssue: false })
      ],
      filters
    );

    expect(result.map((item) => item.id)).toEqual(["match"]);
  });

  it("filters by license, recent commit window, and contributor range", () => {
    const repos = [
      repo({
        id: "match",
        license: "MIT",
        contributorCount: 24,
        lastCommitAt: "2026-05-01T00:00:00.000Z",
        readiness: { score: 91 } as RepoWithScore["readiness"]
      }),
      repo({
        id: "wrong-license",
        license: "Apache-2.0",
        contributorCount: 24,
        lastCommitAt: "2026-05-01T00:00:00.000Z",
        readiness: { score: 91 } as RepoWithScore["readiness"]
      }),
      repo({
        id: "too-old",
        license: "MIT",
        contributorCount: 24,
        lastCommitAt: "2026-03-01T00:00:00.000Z",
        readiness: { score: 91 } as RepoWithScore["readiness"]
      }),
      repo({
        id: "too-small",
        license: "MIT",
        contributorCount: 3,
        lastCommitAt: "2026-05-01T00:00:00.000Z",
        readiness: { score: 91 } as RepoWithScore["readiness"]
      }),
      repo({
        id: "too-large",
        license: "MIT",
        contributorCount: 80,
        lastCommitAt: "2026-05-01T00:00:00.000Z",
        readiness: { score: 91 } as RepoWithScore["readiness"]
      })
    ];

    const result = filterAndSortRepos(repos, {
      language: "",
      minScore: 0,
      sort: "score",
      goodFirstOnly: false,
      license: "MIT",
      lastCommitWithinDays: 14,
      minContributors: 10,
      maxContributors: 50
    });

    expect(result.map((item) => item.id)).toEqual(["match"]);
  });

  it("sorts by stars, activity, and response time", () => {
    const repos = [
      repo({ id: "slow", stars: 50, metrics: { maintainerResponseHours: 72, commitsPerDay: 0.5 } as RepoWithScore["metrics"] }),
      repo({ id: "fast", stars: 10, metrics: { maintainerResponseHours: 8, commitsPerDay: 1 } as RepoWithScore["metrics"] }),
      repo({ id: "unknown", stars: 100, metrics: { maintainerResponseHours: null, commitsPerDay: 3 } as RepoWithScore["metrics"] })
    ];

    const baseFilters: DiscoveryFilters = {
      language: "",
      minScore: 0,
      sort: "score",
      goodFirstOnly: false,
      license: "",
      lastCommitWithinDays: "",
      minContributors: "",
      maxContributors: ""
    };

    expect(filterAndSortRepos(repos, { ...baseFilters, sort: "stars" }).map((item) => item.id)).toEqual([
      "unknown",
      "slow",
      "fast"
    ]);
    expect(filterAndSortRepos(repos, { ...baseFilters, sort: "activity" }).map((item) => item.id)).toEqual([
      "unknown",
      "fast",
      "slow"
    ]);
    expect(filterAndSortRepos(repos, { ...baseFilters, sort: "response_time" }).map((item) => item.id)).toEqual([
      "fast",
      "slow",
      "unknown"
    ]);
  });
});
