import { describe, expect, it } from "vitest";
import { seedIssues, seedRepositories } from "./seed";

describe("seed data", () => {
  it("contains repositories with issue data and scoring metrics", () => {
    expect(seedRepositories).toHaveLength(4);
    expect(seedIssues.length).toBeGreaterThanOrEqual(5);

    const pandas = seedRepositories.find((repo) => repo.fullName === "pandas-dev/pandas");

    expect(pandas).toMatchObject({
      owner: "pandas-dev",
      name: "pandas",
      language: "Python"
    });
    expect(pandas?.metrics.maintainerResponseHours).toBeLessThan(24);
  });
});
