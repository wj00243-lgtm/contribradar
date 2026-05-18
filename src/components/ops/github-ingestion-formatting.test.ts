import { describe, expect, it } from "vitest";

import {
  formatIngestionSummary,
  getIngestionStatusLabel,
  parseRepositoryInput,
  type GitHubIngestionResponse
} from "./github-ingestion-formatting";

describe("GitHub ingestion formatting", () => {
  it("parses comma and newline separated repository refs with duplicates removed", () => {
    expect(parseRepositoryInput("vercel/next.js, prisma/prisma\nvercel/next.js\n  ")).toEqual([
      "vercel/next.js",
      "prisma/prisma"
    ]);
  });

  it("formats ingestion summaries", () => {
    const result: GitHubIngestionResponse = {
      repositories: [],
      totals: {
        requested: 3,
        succeeded: 2,
        failed: 1,
        issuesUpserted: 35
      }
    };

    expect(formatIngestionSummary(null)).toBe("No ingestion run yet.");
    expect(formatIngestionSummary(result)).toBe("2/3 repositories ingested, 35 issues upserted.");
  });

  it("formats status labels", () => {
    expect(getIngestionStatusLabel("succeeded")).toBe("Succeeded");
    expect(getIngestionStatusLabel("failed")).toBe("Failed");
    expect(getIngestionStatusLabel("queued")).toBe("queued");
    expect(getIngestionStatusLabel("")).toBe("Unknown");
  });
});
