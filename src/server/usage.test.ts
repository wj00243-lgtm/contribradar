import { describe, expect, it, vi } from "vitest";

import {
  AI_RECOMMENDATION_FEATURE,
  canCreateAlert,
  canUseAiRecommendations,
  getAiRecommendationUsage,
  getUsagePeriod,
  getNextMonthPeriod,
  incrementAiRecommendationUsage
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
        findUnique: vi.fn().mockResolvedValue({ count: 20 })
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ aiQuota: 20 })
      }
    };

    await expect(canUseAiRecommendations(client, "user_1", new Date("2026-05-09"))).resolves.toBe(false);
  });

  it("increments AI recommendation usage with a monthly upsert", async () => {
    const upsert = vi.fn().mockResolvedValue({ count: 4 });
    const client = {
      usageLog: {
        upsert
      }
    };

    await incrementAiRecommendationUsage(client, "user_1", 2, new Date("2026-05-09"));

    expect(upsert).toHaveBeenCalledWith({
      where: {
        userId_feature_period: {
          userId: "user_1",
          feature: AI_RECOMMENDATION_FEATURE,
          period: "2026-05"
        }
      },
      create: {
        userId: "user_1",
        feature: AI_RECOMMENDATION_FEATURE,
        period: "2026-05",
        count: 2
      },
      update: {
        count: {
          increment: 2
        }
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

  describe("month boundary edge cases", () => {
    it("calculates correct period at month start (2026-05-01 00:00 UTC)", () => {
      expect(getUsagePeriod(new Date("2026-05-01T00:00:00Z"))).toBe("2026-05");
    });

    it("calculates correct period at month end (2026-05-31 23:59 UTC)", () => {
      expect(getUsagePeriod(new Date("2026-05-31T23:59:59Z"))).toBe("2026-05");
    });

    it("handles year boundary (2025-12-31 23:59 UTC)", () => {
      expect(getUsagePeriod(new Date("2025-12-31T23:59:59Z"))).toBe("2025-12");
      expect(getUsagePeriod(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
    });

    it("calculates next month correctly (December -> January year transition)", () => {
      expect(getNextMonthPeriod(new Date("2025-12-15T10:00:00Z"))).toBe("2026-01");
    });

    it("calculates next month correctly (regular month transition)", () => {
      expect(getNextMonthPeriod(new Date("2026-05-15T10:00:00Z"))).toBe("2026-06");
    });

    it("handles short month transition (February -> March)", () => {
      expect(getNextMonthPeriod(new Date("2026-02-28T10:00:00Z"))).toBe("2026-03");
    });

    it("quota reset uses UTC consistently across timezone scenarios", async () => {
      // User in UTC+8 (Singapore) on May 1 at 23:59 local = May 1 15:59 UTC
      const sgTime = new Date("2026-05-01T15:59:00Z");
      // User in UTC-8 (Los Angeles) on April 30 at 23:59 local = May 1 07:59 UTC
      const laTime = new Date("2026-05-01T07:59:00Z");

      expect(getUsagePeriod(sgTime)).toBe("2026-05");
      expect(getUsagePeriod(laTime)).toBe("2026-05");

      // Both users should have same period despite local date difference
      expect(getUsagePeriod(sgTime)).toBe(getUsagePeriod(laTime));
    });
  });
});
