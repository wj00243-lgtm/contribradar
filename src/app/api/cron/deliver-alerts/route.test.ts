import { describe, expect, it, vi } from "vitest";

import { createDeliverAlertsCronHandler } from "./route-handler";

const user = {
  id: "user_1",
  email: "ada@example.com",
  displayName: "Ada"
};

const alert = {
  id: "alert_1",
  message: "New issue",
  reasonText: "Good first issue"
};

function request(token?: string) {
  return new Request("http://localhost/api/cron/deliver-alerts", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

describe("GET /api/cron/deliver-alerts", () => {
  it("rejects requests when CRON_SECRET is configured and bearer token is wrong", async () => {
    const handler = createDeliverAlertsCronHandler({
      cronSecret: "secret",
      client: {},
      checkSmartAlerts: vi.fn(),
      deliverAlerts: vi.fn(),
      getUsersForDelivery: vi.fn()
    });

    const response = await handler(request("wrong"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("CRON_UNAUTHORIZED");
  });

  it("allows local/test requests when CRON_SECRET is missing", async () => {
    const getUsersForDelivery = vi.fn().mockResolvedValue([]);
    const handler = createDeliverAlertsCronHandler({
      cronSecret: "",
      client: { marker: "client" },
      checkSmartAlerts: vi.fn(),
      deliverAlerts: vi.fn(),
      getUsersForDelivery
    });

    const response = await handler(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ usersChecked: 0, alertsCreated: 0, failures: 0, deliveries: [] });
    expect(getUsersForDelivery).toHaveBeenCalledWith({ marker: "client" });
  });

  it("checks DB-backed alerts and delivers newly created alerts for each user", async () => {
    const checkSmartAlerts = vi.fn().mockResolvedValue({
      created: [alert],
      preferences: { email: true, slack: false, digest: "weekly" },
      limitReached: false
    });
    const deliverAlerts = vi.fn().mockResolvedValue({
      attempts: [{ alertId: "alert_1", channel: "email", status: "sent", attempts: 1 }]
    });
    const handler = createDeliverAlertsCronHandler({
      cronSecret: "secret",
      client: { marker: "client" },
      checkSmartAlerts,
      deliverAlerts,
      getUsersForDelivery: vi.fn().mockResolvedValue([user])
    });

    const response = await handler(request("secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(checkSmartAlerts).toHaveBeenCalledWith({ marker: "client" }, "user_1", expect.any(Date));
    expect(deliverAlerts).toHaveBeenCalledWith({
      user,
      alerts: [alert],
      preferences: { email: true, slack: false, digest: "weekly" }
    });
    expect(body).toEqual({
      usersChecked: 1,
      alertsCreated: 1,
      failures: 0,
      deliveries: [
        {
          userId: "user_1",
          created: 1,
          attempts: [{ alertId: "alert_1", channel: "email", status: "sent", attempts: 1 }]
        }
      ]
    });
  });

  it("logs per-user failures and continues processing remaining users", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    const checkSmartAlerts = vi
      .fn()
      .mockRejectedValueOnce(new Error("database timeout"))
      .mockResolvedValueOnce({
        created: [alert],
        preferences: { email: true, slack: false, digest: "weekly" },
        limitReached: false
      });
    const deliverAlerts = vi.fn().mockResolvedValue({
      attempts: [{ alertId: "alert_1", channel: "email", status: "sent", attempts: 1 }]
    });
    const handler = createDeliverAlertsCronHandler({
      cronSecret: "",
      client: { marker: "client" },
      checkSmartAlerts,
      deliverAlerts,
      getUsersForDelivery: vi.fn().mockResolvedValue([
        { ...user, id: "user_1" },
        { ...user, id: "user_2" }
      ]),
      logger
    });

    const response = await handler(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      usersChecked: 2,
      alertsCreated: 1,
      failures: 1,
      deliveries: [
        {
          userId: "user_1",
          created: 0,
          attempts: [],
          error: "database timeout"
        },
        {
          userId: "user_2",
          created: 1,
          attempts: [{ alertId: "alert_1", channel: "email", status: "sent", attempts: 1 }]
        }
      ]
    });
    expect(logger.error).toHaveBeenCalledWith("cron.deliver_alerts.user_failed", expect.any(Error), {
      route: "/api/cron/deliver-alerts",
      userId: "user_1"
    });
  });
});
