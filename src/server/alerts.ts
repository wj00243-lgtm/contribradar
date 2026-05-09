import { hasFeature } from "@/lib/features";
import { canCreateAlert, type AlertLimit } from "@/server/usage";

import { normalizeAlertPreferences, type AlertPreferences } from "./alert-preferences";

type AlertType = "new_issue" | "score_change" | "stale_reminder";

type AlertRecord = {
  id: string;
  isRead: boolean;
  [key: string]: unknown;
};

type IssueRecord = {
  id: string;
  title: string;
  labels: unknown;
  state: string;
  assignees: unknown;
  isStale: boolean;
  updatedAt: Date;
};

type ScoreLogRecord = {
  oldScore: unknown;
  newScore: unknown;
  deltaReason: unknown;
};

type RepositoryRecord = {
  id: string;
  fullName: string;
  readinessScore: unknown;
  issues: IssueRecord[];
  scoreLogs: ScoreLogRecord[];
};

type WatchlistRecord = {
  repos: Array<{
    repository: RepositoryRecord;
  }>;
};

type UserRecord = {
  id: string;
  plan: string;
  settings?: {
    alertPreferences?: unknown;
  } | null;
};

export type AlertClient = {
  user?: {
    findUnique: (args: unknown) => Promise<UserRecord | null>;
  };
  alert: {
    findMany?: (args: unknown) => Promise<AlertRecord[]>;
    count?: (args: { where: { userId: string; isRead?: boolean } }) => Promise<number>;
    findFirst?: (args: unknown) => Promise<AlertRecord | null>;
    create?: (args: { data: CreateAlertData }) => Promise<AlertRecord>;
    updateMany?: (args: { where: { id: string; userId: string }; data: { isRead: boolean } }) => Promise<{ count: number }>;
  };
  userSettings?: {
    findUnique?: (args: { where: { userId: string } }) => Promise<{ maxAlerts?: number | null; alertPreferences?: unknown } | null>;
  };
  watchlist?: {
    findMany: (args: unknown) => Promise<WatchlistRecord[]>;
  };
};

type CreateAlertData = {
  userId: string;
  type: AlertType;
  repoId: string;
  issueId?: string;
  message: string;
  reasonText: string;
};

export class SmartAlertPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmartAlertPlanError";
  }
}

export class SmartAlertUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmartAlertUserError";
  }
}

export async function listAlerts(client: AlertClient, userId: string): Promise<{ alerts: AlertRecord[]; unreadCount: number }> {
  const [alerts, unreadCount] = await Promise.all([
    client.alert.findMany?.({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { repository: true, issue: true }
    }) ?? Promise.resolve([]),
    client.alert.count?.({ where: { userId, isRead: false } }) ?? Promise.resolve(0)
  ]);

  return { alerts, unreadCount };
}

export async function markAlertRead(
  client: AlertClient,
  userId: string,
  alertId: string,
  isRead: boolean
): Promise<{ updated: boolean }> {
  if (!client.alert.updateMany) {
    throw new Error("alert.updateMany is required to mark alerts read.");
  }

  const result = await client.alert.updateMany({
    where: { id: alertId, userId },
    data: { isRead }
  });

  return { updated: result.count > 0 };
}

export async function checkSmartAlerts(
  client: AlertClient,
  userId: string,
  now = new Date()
): Promise<{ created: AlertRecord[]; preferences: AlertPreferences; limit: AlertLimit; limitReached: boolean }> {
  const user = await client.user?.findUnique({
    where: { id: userId },
    include: { settings: true }
  });

  if (!user) {
    throw new SmartAlertUserError("User was not found.");
  }

  if (!hasFeature(user.plan, "smartAlerts")) {
    throw new SmartAlertPlanError("Smart alerts require a Pro plan.");
  }

  const preferences = normalizeAlertPreferences(user.settings?.alertPreferences);
  const limit = await canCreateAlert(client as Parameters<typeof canCreateAlert>[0], userId);

  if (!limit.allowed || !client.watchlist || !client.alert.create) {
    return { created: [], preferences, limit, limitReached: !limit.allowed };
  }

  const watchlists = await client.watchlist.findMany({
    where: { userId, alertEnabled: true },
    include: {
      repos: {
        include: {
          repository: {
            include: {
              issues: true,
              scoreLogs: { orderBy: { calculatedAt: "desc" }, take: 1 }
            }
          }
        }
      }
    }
  });
  const candidates = buildCandidates(watchlists, now);
  const created: AlertRecord[] = [];

  for (const candidate of candidates) {
    if (created.length >= limit.remaining) {
      break;
    }

    const exists = await client.alert.findFirst?.({
      where: {
        userId,
        type: candidate.type,
        repoId: candidate.repoId,
        ...(candidate.issueId ? { issueId: candidate.issueId } : {})
      }
    });

    if (exists) {
      continue;
    }

    created.push(await client.alert.create({ data: { userId, ...candidate } }));
  }

  return {
    created,
    preferences,
    limit,
    limitReached: created.length >= limit.remaining && candidates.length > created.length
  };
}

function buildCandidates(watchlists: WatchlistRecord[], now: Date): Array<Omit<CreateAlertData, "userId">> {
  const candidates: Array<Omit<CreateAlertData, "userId">> = [];

  for (const repository of watchlists.flatMap((watchlist) => watchlist.repos.map((repo) => repo.repository))) {
    const latestScoreLog = repository.scoreLogs[0];

    for (const issue of repository.issues) {
      if (isGoodFirstIssue(issue)) {
        candidates.push({
          type: "new_issue",
          repoId: repository.id,
          issueId: issue.id,
          message: `${repository.fullName} has a new good first issue: ${issue.title}`,
          reasonText: "This watchlisted repository has an open, unassigned issue labeled as good for first contributors."
        });
      }
    }

    if (latestScoreLog) {
      const oldScore = toNumber(latestScoreLog.oldScore);
      const newScore = toNumber(latestScoreLog.newScore);
      const delta = newScore - oldScore;

      if (Math.abs(delta) > 5) {
        candidates.push({
          type: "score_change",
          repoId: repository.id,
          message: `${repository.fullName} readiness score changed by ${Math.round(delta)} points`,
          reasonText: scoreReason(latestScoreLog.deltaReason, oldScore, newScore)
        });
      }
    }

    for (const issue of repository.issues) {
      if (isStaleIssue(issue, now)) {
        candidates.push({
          type: "stale_reminder",
          repoId: repository.id,
          issueId: issue.id,
          message: `${issue.title} has been untouched for 60+ days`,
          reasonText: "This tracked issue appears stale and may need a maintainer follow-up before investing time."
        });
      }
    }
  }

  return candidates;
}

function isGoodFirstIssue(issue: IssueRecord): boolean {
  return (
    issue.state === "open" &&
    toStringArray(issue.assignees).length === 0 &&
    toStringArray(issue.labels).some((label) => ["good first issue", "good-first-issue", "beginner"].includes(label.toLowerCase()))
  );
}

function isStaleIssue(issue: IssueRecord, now: Date): boolean {
  const untouchedDays = (now.getTime() - new Date(issue.updatedAt).getTime()) / 86_400_000;

  return issue.state === "open" && (issue.isStale || untouchedDays >= 60);
}

function scoreReason(deltaReason: unknown, oldScore: number, newScore: number): string {
  if (deltaReason && typeof deltaReason === "object" && "explanation" in deltaReason && typeof deltaReason.explanation === "string") {
    return deltaReason.explanation;
  }

  return `Score changed from ${oldScore} to ${newScore}.`;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value ?? 0);
}
