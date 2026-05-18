import { describe, expect, it, vi } from "vitest";

import { createCronRunsGetHandler } from "./route-handler";

function request(token?: string) {
  return new Request("http://localhost/api/ops/cron-runs", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

describe("GET /api/ops/cron-runs", () => {
  it("returns 401 when OPS_API_KEY is configured and bearer token is wrong", async () => {
    const GET = createCronRunsGetHandler({
      opsApiKey: "secret",
      client: {},
      listCronRuns: vi.fn()
    });

    const response = await GET(request("wrong"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("OPS_UNAUTHORIZED");
  });

  it("returns recent cron runs for authorized operators", async () => {
    const listCronRuns = vi.fn().mockResolvedValue([{ id: "run_1", attempts: [] }]);
    const GET = createCronRunsGetHandler({
      opsApiKey: "secret",
      client: { marker: "client" },
      listCronRuns
    });

    const response = await GET(request("secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ runs: [{ id: "run_1", attempts: [] }] });
    expect(listCronRuns).toHaveBeenCalledWith({ marker: "client" }, { limit: 10 });
  });

  it("fails closed when OPS_API_KEY is missing", async () => {
    const listCronRuns = vi.fn().mockResolvedValue([]);
    const GET = createCronRunsGetHandler({
      opsApiKey: "",
      client: {},
      listCronRuns
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("OPS_AUTH_NOT_CONFIGURED");
    expect(listCronRuns).not.toHaveBeenCalled();
  });
});
