import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatDuration,
  getRunStatusLabel,
  getRunStatusVariant,
  summarizeCronRuns,
  type CronRunView
} from "./cron-runs-formatting";

describe("cron run formatting", () => {
  it("formats status labels and badge variants", () => {
    expect(getRunStatusLabel("succeeded")).toBe("Succeeded");
    expect(getRunStatusLabel("failed")).toBe("Failed");
    expect(getRunStatusLabel("running")).toBe("Running");
    expect(getRunStatusVariant("succeeded")).toBe("default");
    expect(getRunStatusVariant("failed")).toBe("destructive");
    expect(getRunStatusVariant("running")).toBe("secondary");
  });

  it("formats timestamps and missing timestamps", () => {
    expect(formatDateTime("2026-05-10T14:49:58.991Z")).toContain("2026");
    expect(formatDateTime(null)).toBe("Not finished");
    expect(formatDateTime("not-a-date")).toBe("Invalid date");
  });

  it("formats durations", () => {
    expect(formatDuration(850)).toBe("850 ms");
    expect(formatDuration(1250)).toBe("1.3 s");
    expect(formatDuration(null)).toBe("In progress");
  });

  it("summarizes recent runs", () => {
    const runs: CronRunView[] = [
      {
        id: "run_1",
        name: "deliver-alerts",
        status: "succeeded",
        usersChecked: 2,
        alertsCreated: 1,
        failures: 0,
        startedAt: "2026-05-10T14:49:58.991Z",
        attempts: [{ channel: "email", status: "sent", attempts: 1 }]
      },
      {
        id: "run_2",
        name: "deliver-alerts",
        status: "failed",
        usersChecked: 1,
        alertsCreated: 0,
        failures: 1,
        startedAt: "2026-05-10T14:00:00.000Z",
        attempts: [{ channel: "slack", status: "failed", attempts: 2 }]
      },
      {
        id: "run_3",
        name: "deliver-alerts",
        status: "running",
        usersChecked: 0,
        alertsCreated: 0,
        failures: 0,
        startedAt: "2026-05-10T15:00:00.000Z",
        attempts: []
      }
    ];

    expect(summarizeCronRuns(runs)).toEqual({
      totalRuns: 3,
      succeeded: 1,
      failed: 1,
      running: 1,
      deliveryAttempts: 2,
      deliveryFailures: 1
    });
  });
});
