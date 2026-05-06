import { describe, expect, it } from "vitest";
import { seedIssues, seedRepositories } from "@/data/seed";
import { scoreIssueReadiness, scoreRepositoryReadiness } from "./scoring";

describe("scoreRepositoryReadiness", () => {
  it("returns a high score with weighted explainability for responsive beginner-friendly repos", () => {
    const result = scoreRepositoryReadiness(seedRepositories[0]);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.confidence).toBeLessThanOrEqual(4);
    expect(result.breakdown).toHaveLength(5);
    expect(result.breakdown.map((part) => part.key)).toEqual([
      "maintainer_responsiveness",
      "newcomer_friendly",
      "code_health",
      "community_activity",
      "documentation"
    ]);
    expect(result.explanation).toContain("maintainer");
  });

  it("lowers confidence and adds warnings when data is weak", () => {
    const result = scoreRepositoryReadiness(seedRepositories[3]);

    expect(result.score).toBeLessThan(35);
    expect(result.confidence).toBeGreaterThanOrEqual(10);
    expect(result.warnings).toContain("Maintainer response is slow.");
    expect(result.warnings).toContain("Documentation signals are weak.");
  });
});

describe("scoreIssueReadiness", () => {
  it("scores clear unassigned good-first issues highly", () => {
    const result = scoreIssueReadiness(seedIssues[0]);

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.breakdown.map((part) => part.key)).toEqual([
      "clarity",
      "engagement",
      "recency",
      "assignee",
      "labels"
    ]);
    expect(result.explanation).toContain("issue");
  });

  it("penalizes stale issues with thin descriptions", () => {
    const result = scoreIssueReadiness(seedIssues[4]);

    expect(result.score).toBeLessThan(40);
    expect(result.warnings).toContain("Issue appears stale.");
  });
});
