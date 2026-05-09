import { describe, expect, it, vi } from "vitest";

import { SmartAlertPlanError, SmartAlertUserError } from "@/server/alerts";
import { createAlertsGetHandler, createAlertsPostHandler } from "./route-handler";

function request(method = "GET") {
  return new Request("http://localhost/api/v1/alerts", { method });
}

describe("GET /api/v1/alerts", () => {
  it("returns 401 without a session", async () => {
    const GET = createAlertsGetHandler({ auth: vi.fn().mockResolvedValue(null), client: {}, listAlerts: vi.fn() });

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns alerts for the authenticated user", async () => {
    const listAlerts = vi.fn().mockResolvedValue({ alerts: [{ id: "alert_1" }], unreadCount: 1 });
    const GET = createAlertsGetHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: { marker: "client" },
      listAlerts
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ alerts: [{ id: "alert_1" }], unreadCount: 1 });
    expect(listAlerts).toHaveBeenCalledWith({ marker: "client" }, "user_1");
  });
});

describe("POST /api/v1/alerts", () => {
  it("maps Pro plan errors to 403", async () => {
    const POST = createAlertsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: {},
      checkSmartAlerts: vi.fn().mockRejectedValue(new SmartAlertPlanError("Pro required"))
    });

    const response = await POST(request("POST"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "PRO_FEATURE_REQUIRED" } });
  });

  it("maps missing users to 404", async () => {
    const POST = createAlertsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: {},
      checkSmartAlerts: vi.fn().mockRejectedValue(new SmartAlertUserError("Missing"))
    });

    const response = await POST(request("POST"));

    expect(response.status).toBe(404);
  });

  it("returns created smart alerts", async () => {
    const checkSmartAlerts = vi.fn().mockResolvedValue({ created: [{ id: "alert_1" }], limitReached: false });
    const POST = createAlertsPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: { marker: "client" },
      checkSmartAlerts
    });

    const response = await POST(request("POST"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ created: [{ id: "alert_1" }], limitReached: false });
    expect(checkSmartAlerts).toHaveBeenCalledWith({ marker: "client" }, "user_1");
  });
});
