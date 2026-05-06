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
