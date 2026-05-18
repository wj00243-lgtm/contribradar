import { describe, expect, it, vi } from "vitest";

import { nextSettingsData, parseArgs, setUserQuota, validateArgs } from "./set-user-quota.mjs";

describe("set-user-quota", () => {
  it("parses user, quota, alert limit, and apply arguments", () => {
    expect(parseArgs(["--user=275561449", "--ai-quota=1", "--max-alerts=3", "--apply"])).toEqual({
      aiQuota: 1,
      alertPreferences: undefined,
      apply: true,
      maxAlerts: 3,
      user: "275561449"
    });
  });

  it("validates required user and at least one non-negative quota", () => {
    expect(validateArgs({ user: "", aiQuota: Number.NaN, maxAlerts: undefined, apply: false })).toEqual([
      "Missing required argument: --user=<id|email|githubId|displayName>",
      "Invalid --ai-quota value. Use a non-negative integer."
    ]);

    expect(validateArgs({ user: "user_1", aiQuota: undefined, maxAlerts: undefined, apply: false })).toEqual([
      "Set at least one quota: --ai-quota=<number> or --max-alerts=<number>"
    ]);
  });

  it("builds a partial update payload from provided quota values", () => {
    expect(nextSettingsData({ aiQuota: 1, maxAlerts: undefined })).toEqual({ aiQuota: 1 });
    expect(nextSettingsData({ aiQuota: undefined, maxAlerts: 2 })).toEqual({ maxAlerts: 2 });
  });

  it("dry-runs a matched user without upserting settings", async () => {
    const user = {
      id: "user_1",
      email: "ada@example.com",
      githubId: "123",
      displayName: "Ada",
      plan: "pro",
      settings: { aiQuota: 20, maxAlerts: 10, alertPreferences: { email: true } }
    };
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([user]) },
      userSettings: { upsert: vi.fn() }
    };

    await expect(setUserQuota(prisma, { user: "123", aiQuota: 1, maxAlerts: undefined, apply: false })).resolves.toEqual({
      ok: true,
      status: "dry_run",
      user,
      nextSettings: { aiQuota: 1 }
    });
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled();
  });

  it("upserts settings only when apply is true", async () => {
    const user = {
      id: "user_1",
      email: "ada@example.com",
      githubId: "123",
      displayName: "Ada",
      plan: "pro",
      settings: { aiQuota: 20, maxAlerts: 10, alertPreferences: { email: true } }
    };
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([user]) },
      userSettings: { upsert: vi.fn().mockResolvedValue({ aiQuota: 1, maxAlerts: 2 }) }
    };

    await expect(setUserQuota(prisma, { user: "123", aiQuota: 1, maxAlerts: 2, apply: true })).resolves.toEqual({
      ok: true,
      status: "updated",
      user,
      previousSettings: { aiQuota: 20, maxAlerts: 10 },
      updatedSettings: { aiQuota: 1, maxAlerts: 2 }
    });
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: {
        userId: "user_1",
        alertPreferences: { email: true },
        aiQuota: 1,
        maxAlerts: 2
      },
      update: { aiQuota: 1, maxAlerts: 2 },
      select: {
        aiQuota: true,
        maxAlerts: true
      }
    });
  });

  it("uses conservative defaults when creating missing settings", async () => {
    const user = {
      id: "user_1",
      email: "ada@example.com",
      githubId: "123",
      displayName: "Ada",
      plan: "pro",
      settings: null
    };
    const prisma = {
      user: { findMany: vi.fn().mockResolvedValue([user]) },
      userSettings: { upsert: vi.fn().mockResolvedValue({ aiQuota: 20, maxAlerts: 4 }) }
    };

    await setUserQuota(prisma, { user: "123", aiQuota: undefined, maxAlerts: 4, apply: true });

    expect(prisma.userSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          userId: "user_1",
          alertPreferences: {},
          aiQuota: 20,
          maxAlerts: 4
        },
        update: { maxAlerts: 4 }
      })
    );
  });
});
