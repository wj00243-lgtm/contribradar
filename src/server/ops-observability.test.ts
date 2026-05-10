import { describe, expect, it, vi } from "vitest";

import { completeCronRun, failCronRun, listCronRuns, logDeliveryAttempts, startCronRun } from "./ops-observability";

describe("ops observability", () => {
  it("starts and completes a cron run", async () => {
    const create = vi.fn().mockResolvedValue({ id: "run_1", startedAt: new Date("2026-05-10T10:00:00Z") });
    const update = vi.fn().mockResolvedValue({ id: "run_1" });
    const client = {
      cronRun: {
        create,
        update
      }
    };

    const run = await startCronRun(client, "deliver-alerts", new Date("2026-05-10T10:00:00Z"));
    await completeCronRun(client, run, {
      status: "succeeded",
      usersChecked: 2,
      alertsCreated: 3,
      failures: 0,
      finishedAt: new Date("2026-05-10T10:00:03Z")
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: "deliver-alerts",
        status: "running",
        startedAt: new Date("2026-05-10T10:00:00Z")
      }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "run_1" },
      data: {
        status: "succeeded",
        usersChecked: 2,
        alertsCreated: 3,
        failures: 0,
        finishedAt: new Date("2026-05-10T10:00:03Z"),
        durationMs: 3000,
        errorSummary: undefined
      }
    });
  });

  it("marks a cron run failed with an error summary", async () => {
    const update = vi.fn().mockResolvedValue({ id: "run_1" });
    const client = {
      cronRun: {
        update
      }
    };

    await failCronRun(
      client,
      { id: "run_1", startedAt: new Date("2026-05-10T10:00:00Z") },
      new Error("database unavailable"),
      new Date("2026-05-10T10:00:05Z")
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: "run_1" },
      data: expect.objectContaining({
        status: "failed",
        durationMs: 5000,
        errorSummary: "database unavailable"
      })
    });
  });

  it("logs delivery attempts for a run", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const client = {
      deliveryAttemptLog: {
        createMany
      }
    };

    await logDeliveryAttempts(client, {
      runId: "run_1",
      userId: "user_1",
      attempts: [
        {
          alertId: "alert_1",
          channel: "email",
          status: "sent",
          attempts: 2,
          providerId: "email_1"
        }
      ]
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          runId: "run_1",
          userId: "user_1",
          alertId: "alert_1",
          channel: "email",
          status: "sent",
          attempts: 2,
          providerId: "email_1",
          reason: undefined,
          error: undefined
        }
      ]
    });
  });

  it("lists recent cron runs with delivery attempts", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "run_1", attempts: [] }]);
    const client = {
      cronRun: {
        findMany
      }
    };

    await expect(listCronRuns(client, { limit: 5 })).resolves.toEqual([{ id: "run_1", attempts: [] }]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { startedAt: "desc" },
      take: 5,
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });
  });
});
