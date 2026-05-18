import { describe, expect, it, vi } from "vitest";

import { createIngestGitHubPostHandler } from "./route-handler";

function request(body: unknown, token?: string) {
  return new Request("http://localhost/api/ops/ingest-github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/ops/ingest-github", () => {
  it("returns 401 when OPS_API_KEY is configured and bearer token is wrong", async () => {
    const POST = createIngestGitHubPostHandler({
      opsApiKey: "secret",
      githubToken: "github_token",
      client: {} as any,
      ingestRepositories: vi.fn()
    });

    const response = await POST(request({ repositories: ["owner/repo"] }, "wrong"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("OPS_UNAUTHORIZED");
  });

  it("fails closed when OPS_API_KEY is missing", async () => {
    const ingestRepositories = vi.fn();
    const POST = createIngestGitHubPostHandler({
      opsApiKey: "",
      githubToken: "github_token",
      client: {} as any,
      ingestRepositories
    });

    const response = await POST(request({ repositories: ["owner/repo"] }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("OPS_AUTH_NOT_CONFIGURED");
    expect(ingestRepositories).not.toHaveBeenCalled();
  });

  it("returns 400 when the ingestion request body is invalid", async () => {
    const POST = createIngestGitHubPostHandler({
      opsApiKey: "secret",
      githubToken: "github_token",
      client: {} as any,
      ingestRepositories: vi.fn()
    });

    const response = await POST(request({ repositories: [] }, "secret"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INGESTION_REQUEST");
  });

  it("calls the ingestion service for authorized operators", async () => {
    const ingestRepositories = vi.fn().mockResolvedValue({
      repositories: [{ repository: "owner/repo", status: "succeeded", issuesUpserted: 1, readinessScore: 55 }],
      totals: { requested: 1, succeeded: 1, failed: 0, issuesUpserted: 1 }
    });
    const POST = createIngestGitHubPostHandler({
      opsApiKey: "secret",
      githubToken: "github_token",
      client: { marker: "client" } as any,
      ingestRepositories
    });

    const response = await POST(request({ repositories: ["owner/repo"] }, "secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totals.succeeded).toBe(1);
    expect(ingestRepositories).toHaveBeenCalledWith(
      { marker: "client" },
      ["owner/repo"],
      { token: "github_token" }
    );
  });
});
