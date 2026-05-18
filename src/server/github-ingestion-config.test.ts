import { describe, expect, it } from "vitest";

import { parseGitHubIngestionRepos } from "./github-ingestion-config";

describe("parseGitHubIngestionRepos", () => {
  it("returns an empty list for missing config", () => {
    expect(parseGitHubIngestionRepos()).toEqual([]);
    expect(parseGitHubIngestionRepos("")).toEqual([]);
  });

  it("parses comma and newline separated refs with duplicates removed", () => {
    expect(parseGitHubIngestionRepos("vercel/next.js, prisma/prisma\nvercel/next.js")).toEqual([
      "vercel/next.js",
      "prisma/prisma"
    ]);
  });

  it("accepts arrays for tests and future config providers", () => {
    expect(parseGitHubIngestionRepos(["vercel/next.js", " prisma/prisma\nopenai/openai-node "])).toEqual([
      "vercel/next.js",
      "prisma/prisma",
      "openai/openai-node"
    ]);
  });
});
