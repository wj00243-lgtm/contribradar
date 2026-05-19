import { describe, expect, it, vi } from "vitest";

import { createAlertPatchHandler } from "./route-handler";

function request(body: unknown) {
  return new Request("http://localhost/api/v1/alerts/alert_1", {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

function invalidJsonRequest() {
  return new Request("http://localhost/api/v1/alerts/alert_1", {
    method: "PATCH",
    body: "{"
  });
}

describe("PATCH /api/v1/alerts/[id]", () => {
  it("returns 401 without a session", async () => {
    const PATCH = createAlertPatchHandler({ auth: vi.fn().mockResolvedValue(null), client: {}, markAlertRead: vi.fn() });

    const response = await PATCH(request({ isRead: true }), { params: Promise.resolve({ id: "alert_1" }) });

    expect(response.status).toBe(401);
  });

  it("marks an alert read for the authenticated owner", async () => {
    const markAlertRead = vi.fn().mockResolvedValue({ updated: true });
    const PATCH = createAlertPatchHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: { marker: "client" },
      markAlertRead
    });

    const response = await PATCH(request({ isRead: true }), { params: Promise.resolve({ id: "alert_1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: true });
    expect(markAlertRead).toHaveBeenCalledWith({ marker: "client" }, "user_1", "alert_1", true);
  });

  it("returns 400 on invalid JSON", async () => {
    const PATCH = createAlertPatchHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: {},
      markAlertRead: vi.fn()
    });

    const response = await PATCH(invalidJsonRequest(), { params: Promise.resolve({ id: "alert_1" }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it("returns 404 when no alert is updated", async () => {
    const PATCH = createAlertPatchHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: {},
      markAlertRead: vi.fn().mockResolvedValue({ updated: false })
    });

    const response = await PATCH(request({ isRead: true }), { params: Promise.resolve({ id: "alert_1" }) });

    expect(response.status).toBe(404);
  });
});
