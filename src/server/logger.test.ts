import { describe, expect, it, vi } from "vitest";

import { createLogger } from "./logger";

describe("createLogger", () => {
  it("writes structured JSON info, warn, and error events", () => {
    const sink = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    const logger = createLogger({ sink, now: () => new Date("2026-05-10T12:00:00.000Z") });

    logger.info("cron.started", { route: "/api/cron/deliver-alerts" });
    logger.warn("cron.empty", { usersChecked: 0 });
    logger.error("cron.failed", new Error("boom"), { userId: "user_1" });

    expect(JSON.parse(sink.info.mock.calls[0][0])).toEqual({
      level: "info",
      event: "cron.started",
      timestamp: "2026-05-10T12:00:00.000Z",
      route: "/api/cron/deliver-alerts"
    });
    expect(JSON.parse(sink.warn.mock.calls[0][0])).toEqual({
      level: "warn",
      event: "cron.empty",
      timestamp: "2026-05-10T12:00:00.000Z",
      usersChecked: 0
    });
    expect(JSON.parse(sink.error.mock.calls[0][0])).toEqual({
      level: "error",
      event: "cron.failed",
      timestamp: "2026-05-10T12:00:00.000Z",
      userId: "user_1",
      error: {
        message: "boom",
        name: "Error"
      }
    });
  });
});
