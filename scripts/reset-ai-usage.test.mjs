import { describe, expect, it, vi } from "vitest";

import { currentPeriod, parseArgs, resetAiUsage, userLookupWhere, validateArgs } from "./reset-ai-usage.mjs";

describe("reset-ai-usage", () => {
  it("formats usage periods as YYYY-MM", () => {
    expect(currentPeriod(new Date("2026-05-19T12:00:00Z"))).toBe("2026-05");
  });

  it("parses user, period, and apply arguments", () => {
    expect(parseArgs(["--user=275561449", "--period=2026-05", "--apply"])).toEqual({
      apply: true,
      period: "2026-05",
      user: "275561449"
    });
  });

  it("validates required user and period format", () => {
    expect(validateArgs({ user: "", period: "2026-5", apply: false })).toEqual([
      "Missing required argument: --user=<id|email|githubId|displayName>",
      "Invalid --period value. Use YYYY-MM."
    ]);
  });

  it("searches users by stable Prisma fields", () => {
    expect(userLookupWhere("ada")).toEqual({
      OR: [
        { id: "ada" },
        { email: "ada" },
        { githubId: "ada" },
        { displayName: "ada" }
      ]
    });
  });

  it("dry-runs without deleting usage rows", async () => {
    const usage = { count: 3, period: "2026-05", updatedAt: new Date("2026-05-19T12:00:00Z") };
    const user = {
      id: "user_1",
      email: "ada@example.com",
      githubId: "123",
      displayName: "Ada",
      plan: "pro",
      usageLogs: [usage]
    };
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([user]) },
      usageLog: { deleteMany: vi.fn() }
    };

    await expect(resetAiUsage(prisma, { user: "123", period: "2026-05", apply: false })).resolves.toEqual({
      ok: true,
      status: "dry_run",
      user,
      period: "2026-05",
      usage
    });
    expect(prisma.usageLog.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the selected period usage only when apply is true", async () => {
    const usage = { count: 3, period: "2026-05", updatedAt: new Date("2026-05-19T12:00:00Z") };
    const user = {
      id: "user_1",
      email: "ada@example.com",
      githubId: "123",
      displayName: "Ada",
      plan: "pro",
      usageLogs: [usage]
    };
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([user]) },
      usageLog: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) }
    };

    await expect(resetAiUsage(prisma, { user: "123", period: "2026-05", apply: true })).resolves.toEqual({
      ok: true,
      status: "reset",
      user,
      period: "2026-05",
      deleted: 1,
      previousUsage: usage
    });
    expect(prisma.usageLog.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        feature: "ai_recommendation",
        period: "2026-05"
      }
    });
  });

  it("refuses ambiguous user matches", async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: "user_1", email: "a@example.com", githubId: "1", displayName: "Ada", plan: "pro", usageLogs: [] },
          { id: "user_2", email: "b@example.com", githubId: "2", displayName: "Ada", plan: "pro", usageLogs: [] }
        ])
      }
    };

    await expect(resetAiUsage(prisma, { user: "Ada", period: "2026-05", apply: true })).resolves.toMatchObject({
      ok: false,
      status: "ambiguous"
    });
  });
});
