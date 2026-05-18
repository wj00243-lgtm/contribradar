export const AI_RECOMMENDATION_FEATURE = "ai_recommendation";

const DEFAULT_AI_QUOTA = 20;
const DEFAULT_MAX_ALERTS = 10;

type UsageLogRecord = {
  count: number;
};

type UserSettingsRecord = {
  aiQuota?: number | null;
  maxAlerts?: number | null;
};

type UsageClient = {
  usageLog: {
    findUnique?: (args: {
      where: {
        userId_feature_period: {
          userId: string;
          feature: string;
          period: string;
        };
      };
    }) => Promise<UsageLogRecord | null>;
    create?: (args: {
      data: {
        userId: string;
        feature: string;
        period: string;
        count: number;
      };
    }) => Promise<unknown>;
    updateMany?: (args: {
      where: {
        userId: string;
        feature: string;
        period: string;
        count: { lt: number } | { gt: number } | { gte: number } | { lte: number };
      };
      data: {
        count: {
          increment: number;
        } | {
          decrement: number;
        };
      };
    }) => Promise<{ count: number }>;
  };
  userSettings?: {
    findUnique?: (args: { where: { userId: string } }) => Promise<UserSettingsRecord | null>;
  };
};

type AlertClient = {
  alert: {
    count: (args: { where: { userId: string; isRead?: boolean } }) => Promise<number>;
  };
  userSettings?: {
    findUnique?: (args: { where: { userId: string } }) => Promise<UserSettingsRecord | null>;
  };
};

export type AiRecommendationUsage = {
  used: number;
  limit: number;
  remaining: number;
  period: string;
};

export type AlertLimit = {
  allowed: boolean;
  active: number;
  limit: number;
  remaining: number;
};

export function getUsagePeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export async function getAiRecommendationUsage(
  client: UsageClient,
  userId: string,
  date = new Date()
): Promise<AiRecommendationUsage> {
  const period = getUsagePeriod(date);
  const [usageLog, settings] = await Promise.all([
    client.usageLog.findUnique?.({
      where: {
        userId_feature_period: {
          userId,
          feature: AI_RECOMMENDATION_FEATURE,
          period
        }
      }
    }) ?? Promise.resolve(null),
    getUserSettings(client, userId)
  ]);

  const used = usageLog?.count ?? 0;
  const limit = settings?.aiQuota ?? DEFAULT_AI_QUOTA;

  return {
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    period
  };
}

export async function consumeAiRecommendationQuota(
  client: UsageClient,
  userId: string,
  amount = 1,
  date = new Date()
): Promise<boolean> {
  if (!client.usageLog.updateMany || !client.usageLog.create) {
    throw new Error("usageLog.updateMany and usageLog.create are required to consume AI recommendation quota.");
  }

  const usage = await getAiRecommendationUsage(client, userId, date);
  
  if (usage.used + amount > usage.limit) {
    return false;
  }

  const period = getUsagePeriod(date);

  if (usage.used === 0) {
    try {
      await client.usageLog.create({
        data: {
          userId,
          feature: AI_RECOMMENDATION_FEATURE,
          period,
          count: amount
        }
      });
      return true;
    } catch {
      // Ignore unique constraint violation and fall through to updateMany
    }
  }

  const result = await client.usageLog.updateMany({
    where: {
      userId,
      feature: AI_RECOMMENDATION_FEATURE,
      period,
      count: { lte: usage.limit - amount }
    },
    data: {
      count: { increment: amount }
    }
  });

  return result.count > 0;
}

export async function refundAiRecommendationQuota(
  client: UsageClient,
  userId: string,
  amount = 1,
  date = new Date()
): Promise<void> {
  if (!client.usageLog.updateMany) {
    return;
  }

  await client.usageLog.updateMany({
    where: {
      userId,
      feature: AI_RECOMMENDATION_FEATURE,
      period: getUsagePeriod(date),
      count: { gte: amount }
    },
    data: {
      count: { decrement: amount }
    }
  });
}

export async function canCreateAlert(client: AlertClient, userId: string): Promise<AlertLimit> {
  const [active, settings] = await Promise.all([
    client.alert.count({
      where: {
        userId,
        isRead: false
      }
    }),
    getUserSettings(client, userId)
  ]);
  const limit = settings?.maxAlerts ?? DEFAULT_MAX_ALERTS;
  const remaining = Math.max(limit - active, 0);

  return {
    allowed: active < limit,
    active,
    limit,
    remaining
  };
}

async function getUserSettings(
  client: { userSettings?: { findUnique?: (args: { where: { userId: string } }) => Promise<UserSettingsRecord | null> } },
  userId: string
): Promise<UserSettingsRecord | null> {
  return client.userSettings?.findUnique?.({ where: { userId } }) ?? null;
}
