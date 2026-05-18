import { describe, expect, it, vi } from "vitest";

import {
  AI_RECOMMENDATION_FEATURE,
  canCreateAlert,
  consumeAiRecommendationQuota,
  refundAiRecommendationQuota,
  getAiRecommendationUsage,
  getUsagePeriod
} from "./usage";

describe("usage service", () => {
  it("formats usage periods as YYYY-MM", () => {
    expect(getUsagePeriod(new Date("2026-05-09T10:00:00Z"))).toBe("2026-05");
  });

  it("returns zero usage and default quota when no log or settings exist", async () => {
    const client = {
      usageLog: {
        findUnique: vi.fn().mockResolvedValue(null)
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue(null)
      }
    };

    await expect(getAiRecommendationUsage(client, "user_1", new Date("2026-05-09"))).resolves.toEqual({
      used: 0,
      limit: 20,
      remaining: 20,
      period: "2026-05"
    });
  });

  it("uses existing usage count and user quota overrides", async () => {
    const client = {
      usageLog: {
        findUnique: vi.fn().mockResolvedValue({ count: 12 })
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ aiQuota: 30 })
      }
    };

    await expect(getAiRecommendationUsage(client, "user_1", new Date("2026-05-09"))).resolves.toEqual({
      used: 12,
      limit: 30,
      remaining: 18,
      period: "2026-05"
    });
  });

  it("blocks AI recommendations when the monthly quota is exhausted", async () => {
    const client = {
      usageLog: {
        findUnique: vi.fn().mockResolvedValue({ count: 20 }),
        updateMany: vi.fn(),
        create: vi.fn()
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ aiQuota: 20 })
      }
    };

    await expect(consumeAiRecommendationQuota(client, "user_1", 1, new Date("2026-05-09"))).resolves.toBe(false);
    expect(client.usageLog.updateMany).not.toHaveBeenCalled();
    expect(client.usageLog.create).not.toHaveBeenCalled();
  });

  it("creates a new usage log when no usage exists and quota is available", async () => {
    const client = {
      usageLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn(),
        create: vi.fn().mockResolvedValue({})
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ aiQuota: 20 })
      }
    };

    await expect(consumeAiRecommendationQuota(client, "user_1", 1, new Date("2026-05-09"))).resolves.toBe(true);
    expect(client.usageLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        feature: AI_RECOMMENDATION_FEATURE,
        period: "2026-05",
        count: 1
      }
    });
    expect(client.usageLog.updateMany).not.toHaveBeenCalled();
  });

  it("increments existing usage atomically when quota is available", async () => {
    const client = {
      usageLog: {
        findUnique: vi.fn().mockResolvedValue({ count: 10 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn()
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ aiQuota: 20 })
      }
    };

    await expect(consumeAiRecommendationQuota(client, "user_1", 2, new Date("2026-05-09"))).resolves.toBe(true);
    expect(client.usageLog.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        feature: AI_RECOMMENDATION_FEATURE,
        period: "2026-05",
        count: { lte: 18 }
      },
      data: {
        count: { increment: 2 }
      }
    });
  });

  it("refunds AI recommendation usage accurately", async () => {
    const client = {
      usageLog: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };

    await refundAiRecommendationQuota(client, "user_1", 2, new Date("2026-05-09"));
    expect(client.usageLog.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        feature: AI_RECOMMENDATION_FEATURE,
        period: "2026-05",
        count: { gte: 2 }
      },
      data: {
        count: { decrement: 2 }
      }
    });
  });

  it("blocks alert creation at the user's active alert limit", async () => {
    const client = {
      alert: {
        count: vi.fn().mockResolvedValue(10)
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ maxAlerts: 10 })
      }
    };

    await expect(canCreateAlert(client, "user_1")).resolves.toEqual({
      allowed: false,
      active: 10,
      limit: 10,
      remaining: 0
    });
  });
});
