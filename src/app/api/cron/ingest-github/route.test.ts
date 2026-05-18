import { describe, expect, it, vi } from "vitest";

import { createIngestGitHubCronHandler } from "./route-handler";

function request(token?: string) {
  return new Request("http://localhost/api/cron/ingest-github", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

describe("GET /api/cron/ingest-github", () => {
  it("rejects requests when CRON_SECRET is configured and bearer token is wrong", async () => {
    const GET = createIngestGitHubCronHandler({
      cronSecret: "secret",
      githubToken: "github_token",
      repositoryConfig: "vercel/next.js",
      client: {},
      ingestRepositories: vi.fn()
    });

    const response = await GET(request("wrong"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("CRON_UNAUTHORIZED");
  });

  it("returns a no-op response when no repositories are configured", async () => {
    const ingestRepositories = vi.fn();
    const GET = createIngestGitHubCronHandler({
      cronSecret: "",
      githubToken: "github_token",
      repositoryConfig: "",
      client: {},
      ingestRepositories
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      skipped: true,
      reason: "GITHUB_INGEST_REPOS is empty.",
      repositories: [],
      totals: {
        requested: 0,
        succeeded: 0,
        failed: 0,
        issuesUpserted: 0
      }
    });
    expect(ingestRepositories).not.toHaveBeenCalled();
  });

  it("rejects oversized repository config", async () => {
    const GET = createIngestGitHubCronHandler({
      cronSecret: "",
      githubToken: "github_token",
      repositoryConfig: Array.from({ length: 11 }, (_, index) => `owner/repo-${index}`).join(","),
      client: {},
      ingestRepositories: vi.fn()
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("GITHUB_INGEST_REPOS_INVALID");
  });

  it("ingests configured repositories for authorized cron calls", async () => {
    const ingestRepositories = vi.fn().mockResolvedValue({
      repositories: [{ repository: "vercel/next.js", status: "succeeded", issuesUpserted: 20, readinessScore: 45 }],
      totals: { requested: 1, succeeded: 1, failed: 0, issuesUpserted: 20 }
    });
    const GET = createIngestGitHubCronHandler({
      cronSecret: "secret",
      githubToken: "github_token",
      repositoryConfig: "vercel/next.js",
      client: { marker: "client" },
      ingestRepositories
    });

    const response = await GET(request("secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      skipped: false,
      repositories: [{ repository: "vercel/next.js", status: "succeeded", issuesUpserted: 20, readinessScore: 45 }],
      totals: { requested: 1, succeeded: 1, failed: 0, issuesUpserted: 20 }
    });
    expect(ingestRepositories).toHaveBeenCalledWith(
      { marker: "client" },
      ["vercel/next.js"],
      { token: "github_token" }
    );
  });
});
