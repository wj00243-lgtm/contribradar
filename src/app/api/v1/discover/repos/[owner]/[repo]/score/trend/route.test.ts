import { describe, expect, it, vi } from "vitest";

import { createScoreTrendGetHandler } from "./route-handler";

function request() {
  return new Request("http://localhost/api/v1/discover/repos/acme/tooling/score/trend");
}

describe("GET /api/v1/discover/repos/[owner]/[repo]/score/trend", () => {
  it("returns 401 without a session", async () => {
    const GET = createScoreTrendGetHandler({ auth: vi.fn().mockResolvedValue(null), client: {}, getScoreTrend: vi.fn() });

    const response = await GET(request(), { params: Promise.resolve({ owner: "acme", repo: "tooling" }) });

    expect(response.status).toBe(401);
  });

  it("returns 403 for users without score trends", async () => {
    const GET = createScoreTrendGetHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "free" } }),
      client: {},
      getScoreTrend: vi.fn()
    });

    const response = await GET(request(), { params: Promise.resolve({ owner: "acme", repo: "tooling" }) });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the repository does not exist", async () => {
    const GET = createScoreTrendGetHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "pro" } }),
      client: {},
      getScoreTrend: vi.fn().mockResolvedValue({
        status: 404,
        error: { code: "REPOSITORY_NOT_FOUND", message: "Missing" }
      })
    });

    const response = await GET(request(), { params: Promise.resolve({ owner: "acme", repo: "tooling" }) });

    expect(response.status).toBe(404);
  });

  it("returns score trend data for pro users", async () => {
    const getScoreTrend = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        repository: { id: "repo_1", fullName: "acme/tooling" },
        points: [{ date: "2026-05-05", score: 72 }],
        annotations: []
      }
    });
    const GET = createScoreTrendGetHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1", plan: "pro" } }),
      client: { marker: "client" },
      getScoreTrend
    });

    const response = await GET(request(), { params: Promise.resolve({ owner: "acme", repo: "tooling" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      repository: { id: "repo_1", fullName: "acme/tooling" },
      points: [{ date: "2026-05-05", score: 72 }],
      annotations: []
    });
    expect(getScoreTrend).toHaveBeenCalledWith({ marker: "client" }, "acme", "tooling");
  });
});
