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

  it("fails closed when CRON_SECRET is missing and local bypass is disabled", async () => {
    const ingestRepositories = vi.fn();
    const GET = createIngestGitHubCronHandler({
      allowMissingCronSecret: false,
      cronSecret: "",
      githubToken: "github_token",
      repositoryConfig: "",
      client: {},
      ingestRepositories,
      startCronRun: vi.fn()
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("CRON_AUTH_NOT_CONFIGURED");
    expect(ingestRepositories).not.toHaveBeenCalled();
  });

  it("returns a no-op response when no repositories are configured", async () => {
    const ingestRepositories = vi.fn();
    const completeCronRun = vi.fn();
    const GET = createIngestGitHubCronHandler({
      allowMissingCronSecret: true,
      cronSecret: "",
      githubToken: "github_token",
      repositoryConfig: "",
      client: {},
      ingestRepositories,
      startCronRun: vi.fn().mockResolvedValue({ id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") }),
      completeCronRun,
      now: () => new Date("2026-05-18T09:00:02Z")
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      skipped: true,
      reason: "GITHUB_INGEST_REPOS is empty.",
      runId: "run_1",
      repositories: [],
      totals: {
        requested: 0,
        succeeded: 0,
        failed: 0,
        issuesUpserted: 0
      }
    });
    expect(ingestRepositories).not.toHaveBeenCalled();
    expect(completeCronRun).toHaveBeenCalledWith(
      {},
      { id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") },
      {
        status: "succeeded",
        usersChecked: 0,
        alertsCreated: 0,
        failures: 0,
        finishedAt: new Date("2026-05-18T09:00:02Z")
      }
    );
  });

  it("rejects oversized repository config", async () => {
    const failCronRun = vi.fn();
    const GET = createIngestGitHubCronHandler({
      allowMissingCronSecret: true,
      cronSecret: "",
      githubToken: "github_token",
      repositoryConfig: Array.from({ length: 11 }, (_, index) => `owner/repo-${index}`).join(","),
      client: {},
      ingestRepositories: vi.fn(),
      startCronRun: vi.fn().mockResolvedValue({ id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") }),
      failCronRun,
      now: () => new Date("2026-05-18T09:00:02Z")
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("GITHUB_INGEST_REPOS_INVALID");
    expect(failCronRun).toHaveBeenCalledWith(
      {},
      { id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") },
      expect.any(Error),
      new Date("2026-05-18T09:00:02Z")
    );
  });

  it("ingests configured repositories for authorized cron calls", async () => {
    const completeCronRun = vi.fn();
    const ingestRepositories = vi.fn().mockResolvedValue({
      repositories: [{ repository: "vercel/next.js", status: "succeeded", issuesUpserted: 20, readinessScore: 45 }],
      totals: { requested: 1, succeeded: 1, failed: 0, issuesUpserted: 20 }
    });
    const GET = createIngestGitHubCronHandler({
      cronSecret: "secret",
      githubToken: "github_token",
      repositoryConfig: "vercel/next.js",
      client: { marker: "client" },
      ingestRepositories,
      startCronRun: vi.fn().mockResolvedValue({ id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") }),
      completeCronRun,
      now: () => new Date("2026-05-18T09:00:05Z")
    });

    const response = await GET(request("secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      skipped: false,
      runId: "run_1",
      repositories: [{ repository: "vercel/next.js", status: "succeeded", issuesUpserted: 20, readinessScore: 45 }],
      totals: { requested: 1, succeeded: 1, failed: 0, issuesUpserted: 20 }
    });
    expect(ingestRepositories).toHaveBeenCalledWith(
      { marker: "client" },
      ["vercel/next.js"],
      { token: "github_token" }
    );
    expect(completeCronRun).toHaveBeenCalledWith(
      { marker: "client" },
      { id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") },
      {
        status: "succeeded",
        usersChecked: 1,
        alertsCreated: 20,
        failures: 0,
        finishedAt: new Date("2026-05-18T09:00:05Z")
      }
    );
  });

  it("marks the cron run failed when ingestion throws", async () => {
    const failCronRun = vi.fn();
    const GET = createIngestGitHubCronHandler({
      allowMissingCronSecret: true,
      cronSecret: "",
      githubToken: "github_token",
      repositoryConfig: "vercel/next.js",
      client: { marker: "client" },
      ingestRepositories: vi.fn().mockRejectedValue(new Error("GitHub timeout")),
      startCronRun: vi.fn().mockResolvedValue({ id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") }),
      failCronRun,
      now: () => new Date("2026-05-18T09:00:05Z")
    });

    await expect(GET(request())).rejects.toThrow("GitHub timeout");
    expect(failCronRun).toHaveBeenCalledWith(
      { marker: "client" },
      { id: "run_1", startedAt: new Date("2026-05-18T09:00:00Z") },
      expect.any(Error),
      new Date("2026-05-18T09:00:05Z")
    );
  });
});
