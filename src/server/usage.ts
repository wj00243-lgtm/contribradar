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
    upsert?: (args: {
      where: {
        userId_feature_period: {
          userId: string;
          feature: string;
          period: string;
        };
      };
      create: {
        userId: string;
        feature: string;
        period: string;
        count: number;
      };
      update: {
        count: {
          increment: number;
        };
      };
    }) => Promise<UsageLogRecord>;
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

export async function canUseAiRecommendations(client: UsageClient, userId: string, date = new Date()): Promise<boolean> {
  const usage = await getAiRecommendationUsage(client, userId, date);

  return usage.used < usage.limit;
}

export async function incrementAiRecommendationUsage(
  client: UsageClient,
  userId: string,
  amount = 1,
  date = new Date()
): Promise<UsageLogRecord> {
  if (!client.usageLog.upsert) {
    throw new Error("usageLog.upsert is required to increment AI recommendation usage.");
  }

  const period = getUsagePeriod(date);

  return client.usageLog.upsert({
    where: {
      userId_feature_period: {
        userId,
        feature: AI_RECOMMENDATION_FEATURE,
        period
      }
    },
    create: {
      userId,
      feature: AI_RECOMMENDATION_FEATURE,
      period,
      count: amount
    },
    update: {
      count: {
        increment: amount
      }
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
