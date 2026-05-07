import { describe, expect, it } from "vitest";
import { discoverIssues, discoverRepositories, getRepositoryScore } from "./discovery";

describe("discoverRepositories", () => {
  it("filters by language, minimum score, topic, and good-first-issue availability", () => {
    const result = discoverRepositories({
      language: "Python",
      topics: ["data-science"],
      minScore: 70,
      hasGoodFirstIssue: true,
      sort: "score",
      page: 1,
      limit: 10
    });

    expect(result.total).toBe(1);
    expect(result.repos[0].fullName).toBe("pandas-dev/pandas");
    expect(result.facets.languages).toContain("Python");
    expect(result.facets.topics).toContain("data-science");
  });

  it("sorts by maintainer response time", () => {
    const result = discoverRepositories({
      sort: "response_time",
      page: 1,
      limit: 2
    });

    expect(result.repos[0].fullName).toBe("pandas-dev/pandas");
  });

  it("defaults non-finite pagination values", () => {
    const result = discoverRepositories({
      page: Number.NaN,
      limit: Number.NaN
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.repos.length).toBeGreaterThan(0);
  });

  it("returns repository topics without leaking mutations into later calls or facets", () => {
    const firstResult = discoverRepositories();
    const originalTopic = firstResult.repos[0].topics[0];

    firstResult.repos[0].topics[0] = "mutated-topic";

    const nextResult = discoverRepositories();

    expect(nextResult.repos[0].topics[0]).toBe(originalTopic);
    expect(nextResult.facets.topics).not.toContain("mutated-topic");
  });
});

describe("getRepositoryScore", () => {
  it("returns a score response by owner and repo", () => {
    const result = getRepositoryScore("tokio-rs", "tracing");

    expect(result.status).toBe(200);
    expect(result.data?.readiness_score).toBeGreaterThan(75);
    expect(result.data?.breakdown).toHaveLength(5);
  });

  it("returns a structured not found response", () => {
    const result = getRepositoryScore("missing", "repo");

    expect(result.status).toBe(404);
    expect(result.error?.code).toBe("REPOSITORY_NOT_FOUND");
  });
});

describe("discoverIssues", () => {
  it("orders issues by readiness score before pagination", () => {
    const result = discoverIssues({
      page: 1,
      limit: 5
    });

    const scores = result.issues.map((issue) => issue.readiness.score);

    expect(scores).toEqual([...scores].sort((left, right) => right - left));
  });

  it("defaults non-finite pagination values", () => {
    const result = discoverIssues({
      page: Number.NaN,
      limit: Number.NaN
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("returns issue labels without leaking mutations into later calls", () => {
    const firstResult = discoverIssues();
    const originalLabel = firstResult.issues[0].labels[0];

    firstResult.issues[0].labels[0] = "mutated-label";

    const nextResult = discoverIssues();

    expect(nextResult.issues[0].labels[0]).toBe(originalLabel);
  });

  it("filters unassigned beginner-friendly issues", () => {
    const result = discoverIssues({
      labels: ["good first issue"],
      minIssueScore: 70,
      hasNoAssignee: true,
      difficulty: "easy",
      page: 1,
      limit: 10
    });

    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.issues.every((issue) => issue.assignees.length === 0)).toBe(true);
  });
});
