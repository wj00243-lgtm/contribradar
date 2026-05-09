import { describe, expect, it, vi } from "vitest";

import { checkSmartAlerts, listAlerts, markAlertRead } from "./alerts";

function repo(overrides = {}) {
  return {
    id: "repo_1",
    fullName: "acme/tooling",
    readinessScore: 82,
    scoreLogs: [],
    issues: [],
    ...overrides
  };
}

describe("listAlerts", () => {
  it("returns alerts with unread count", async () => {
    const client = {
      alert: {
        findMany: vi.fn().mockResolvedValue([{ id: "alert_1", isRead: false }]),
        count: vi.fn().mockResolvedValue(1)
      }
    };

    await expect(listAlerts(client, "user_1")).resolves.toEqual({
      alerts: [{ id: "alert_1", isRead: false }],
      unreadCount: 1
    });
  });
});

describe("markAlertRead", () => {
  it("updates only alerts owned by the user", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = {
      alert: {
        updateMany
      }
    };

    await expect(markAlertRead(client, "user_1", "alert_1", true)).resolves.toEqual({ updated: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "alert_1", userId: "user_1" },
      data: { isRead: true }
    });
  });

  it("reports not updated when the alert is not owned by the user", async () => {
    const client = {
      alert: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    };

    await expect(markAlertRead(client, "user_1", "alert_2", true)).resolves.toEqual({ updated: false });
  });
});

describe("checkSmartAlerts", () => {
  it("creates new issue, score change, and stale reminder alerts", async () => {
    const create = vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: `${data.type}_1`, ...data }));
    const client = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "user_1", plan: "pro", settings: { alertPreferences: { email: true } } })
      },
      alert: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
        create
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ maxAlerts: 10 })
      },
      watchlist: {
        findMany: vi.fn().mockResolvedValue([
          {
            repos: [
              {
                repository: repo({
                  issues: [
                    {
                      id: "issue_new",
                      title: "Add CLI docs",
                      labels: ["good first issue"],
                      state: "open",
                      assignees: [],
                      isStale: false,
                      updatedAt: new Date("2026-05-01T00:00:00Z")
                    },
                    {
                      id: "issue_stale",
                      title: "Refresh parser docs",
                      labels: ["documentation"],
                      state: "open",
                      assignees: [],
                      isStale: true,
                      updatedAt: new Date("2026-02-01T00:00:00Z")
                    }
                  ],
                  scoreLogs: [
                    {
                      oldScore: 83,
                      newScore: 70,
                      deltaReason: { explanation: "Maintainer response slowed down." }
                    }
                  ]
                })
              }
            ]
          }
        ])
      }
    };

    const result = await checkSmartAlerts(client, "user_1", new Date("2026-05-09T00:00:00Z"));

    expect(result.created).toHaveLength(3);
    expect(result.limitReached).toBe(false);
    expect(create.mock.calls.map((call) => call[0].data.type)).toEqual(["new_issue", "score_change", "stale_reminder"]);
  });

  it("does not create alerts when the active limit is reached", async () => {
    const client = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "user_1", plan: "pro", settings: null })
      },
      alert: {
        count: vi.fn().mockResolvedValue(10),
        findFirst: vi.fn(),
        create: vi.fn()
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ maxAlerts: 10 })
      },
      watchlist: {
        findMany: vi.fn()
      }
    };

    const result = await checkSmartAlerts(client, "user_1");

    expect(result).toMatchObject({ created: [], limitReached: true });
    expect(client.watchlist.findMany).not.toHaveBeenCalled();
  });
});
