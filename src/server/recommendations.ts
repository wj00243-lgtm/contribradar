import { hasFeature } from "@/lib/features";
import {
  consumeAiRecommendationQuota,
  refundAiRecommendationQuota,
  getAiRecommendationUsage,
  type AiRecommendationUsage
} from "@/server/usage";

import { generateJsonWithGemini } from "./gemini";

type JsonArray = string[];

type UserRecord = {
  id: string;
  plan: string;
  skillVector: unknown;
  experienceLevel: string;
  weeklyHours: number;
};

type RepositoryRecord = {
  id: string;
  fullName: string;
  language: string;
  topics: unknown;
  readinessScore: unknown;
  stars: number;
  openIssues: number;
  description: string;
};

type ContributionRecord = {
  type: string;
  status: string;
  repository: {
    fullName: string;
    language: string;
    topics: unknown;
  };
};

type WatchlistRecord = {
  repos: Array<{
    repository: RepositoryRecord;
  }>;
};

export type RecommendationClient = {
  user: {
    findUnique: (args: { where: { id: string } }) => Promise<UserRecord | null>;
  };
  contribution: {
    findMany: (args: unknown) => Promise<ContributionRecord[]>;
  };
  watchlist: {
    findMany: (args: unknown) => Promise<WatchlistRecord[]>;
  };
  repository: {
    findMany: (args: unknown) => Promise<RepositoryRecord[]>;
  };
  usageLog: Parameters<typeof consumeAiRecommendationQuota>[0]["usageLog"];
  userSettings?: Parameters<typeof consumeAiRecommendationQuota>[0]["userSettings"];
};

export type RecommendationContext = {
  user: {
    id: string;
    plan: string;
    languages: string[];
    topics: string[];
    experienceLevel: string;
    weeklyHours: number;
  };
  contributions: Array<{
    repo: string;
    language: string;
    topics: string[];
    type: string;
    status: string;
  }>;
  watchlistedRepos: Array<{
    repoId: string;
    fullName: string;
    language: string;
    topics: string[];
    readinessScore: number;
  }>;
  candidates: RecommendationCandidate[];
};

export type RecommendationCandidate = {
  repoId: string;
  fullName: string;
  language: string;
  topics: string[];
  readinessScore: number;
  stars: number;
  openIssues: number;
  description: string;
};

export type AiRepoRecommendation = {
  repoId: string;
  fullName: string;
  fitScore: number;
  reason: string;
  suggestedIssueSearch?: string;
};

type AiRecommendationPayload = {
  recommendations: AiRepoRecommendation[];
};

function validateRecommendations(payload: unknown): AiRecommendationPayload {
  if (!payload || typeof payload !== "object" || !("recommendations" in payload)) {
    throw new RecommendationUserError("AI recommendation payload must include recommendations array.");
  }

  const { recommendations } = payload as { recommendations: unknown };

  if (!Array.isArray(recommendations)) {
    throw new RecommendationUserError("recommendations must be an array.");
  }

  if (recommendations.length === 0) {
    throw new RecommendationUserError("recommendations array must not be empty");
  }

  for (const rec of recommendations) {
    if (!rec || typeof rec !== "object") {
      throw new RecommendationUserError("Each recommendation must be an object.");
    }

    const recommendation = rec as Record<string, unknown>;

    if (!recommendation.repoId || typeof recommendation.repoId !== "string") {
      throw new RecommendationUserError("repoId is required and must be a string.");
    }

    if (typeof recommendation.fitScore !== "number" || recommendation.fitScore < 0 || recommendation.fitScore > 100) {
      throw new RecommendationUserError("fitScore must be a number between 0 and 100");
    }

    if (!recommendation.reason || typeof recommendation.reason !== "string") {
      throw new RecommendationUserError("reason is required and must be a string.");
    }
  }

  return payload as AiRecommendationPayload;
}

type RecommendationOptions = {
  apiKey?: string;
  model?: string;
  now?: Date;
  generator?: (
    context: RecommendationContext,
    options: { apiKey?: string; model?: string }
  ) => Promise<AiRecommendationPayload>;
};

export class RecommendationPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationPlanError";
  }
}

export class RecommendationQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationQuotaError";
  }
}

export class RecommendationUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationUserError";
  }
}

export async function buildRecommendationContext(client: RecommendationClient, userId: string): Promise<RecommendationContext> {
  const user = await client.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new RecommendationUserError("User was not found.");
  }

  const [contributions, watchlists, candidates] = await Promise.all([
    client.contribution.findMany({
      where: { userId },
      orderBy: { openedAt: "desc" },
      take: 20,
      include: { repository: true }
    }),
    client.watchlist.findMany({
      where: { userId },
      include: { repos: { include: { repository: true } } },
      take: 10
    }),
    client.repository.findMany({
      where: { readinessScore: { gte: 50 } },
      orderBy: [{ readinessScore: "desc" }, { stars: "desc" }],
      take: 30
    })
  ]);

  const skills = parseSkillVector(user.skillVector);

  return {
    user: {
      id: user.id,
      plan: user.plan,
      languages: skills.languages,
      topics: skills.topics,
      experienceLevel: user.experienceLevel,
      weeklyHours: user.weeklyHours
    },
    contributions: contributions.map((contribution) => ({
      repo: contribution.repository.fullName,
      language: contribution.repository.language,
      topics: toStringArray(contribution.repository.topics),
      type: contribution.type,
      status: contribution.status
    })),
    watchlistedRepos: watchlists
      .flatMap((watchlist) => watchlist.repos)
      .map(({ repository }) => ({
        repoId: repository.id,
        fullName: repository.fullName,
        language: repository.language,
        topics: toStringArray(repository.topics),
        readinessScore: toNumber(repository.readinessScore)
      })),
    candidates: candidates.map(toCandidate)
  };
}

export async function generateAiRepoRecommendations(
  client: RecommendationClient,
  userId: string,
  options: RecommendationOptions
): Promise<{ recommendations: AiRepoRecommendation[]; usage: AiRecommendationUsage }> {
  const context = await buildRecommendationContext(client, userId);

  if (!hasFeature(context.user.plan, "aiRecommendations")) {
    throw new RecommendationPlanError("AI recommendations require a Pro plan.");
  }

  const now = options.now ?? new Date();
  const hasConsumed = await consumeAiRecommendationQuota(client, userId, 1, now);

  if (!hasConsumed) {
    throw new RecommendationQuotaError("AI recommendation quota is exhausted for this month.");
  }

  let payload;
  try {
    const rawPayload = await (options.generator ?? defaultRecommendationGenerator)(context, {
      apiKey: options.apiKey,
      model: options.model
    });
    payload = validateRecommendations(rawPayload);
  } catch (error) {
    await refundAiRecommendationQuota(client, userId, 1, now);
    throw error;
  }

  const usage = await getAiRecommendationUsage(client, userId, now);

  return {
    recommendations: payload.recommendations,
    usage: {
      ...usage,
      used: usage.used === 0 ? 1 : usage.used,
      remaining: usage.used === 0 ? Math.max(usage.limit - 1, 0) : usage.remaining
    }
  };
}

async function defaultRecommendationGenerator(
  context: RecommendationContext,
  options: { apiKey?: string; model?: string }
): Promise<AiRecommendationPayload> {
  return generateJsonWithGemini<AiRecommendationPayload>({
    apiKey: options.apiKey,
    model: options.model,
    systemPrompt:
      "You are ContribRadar's repository recommendation engine. Return compact JSON only with a recommendations array. Each item must include repoId, fullName, fitScore, reason, and suggestedIssueSearch.",
    userPrompt: JSON.stringify(context)
  });
}

function parseSkillVector(skillVector: unknown): { languages: string[]; topics: string[] } {
  if (!skillVector || typeof skillVector !== "object") {
    return { languages: [], topics: [] };
  }

  const value = skillVector as { languages?: unknown; topics?: unknown };

  return {
    languages: toStringArray(value.languages),
    topics: toStringArray(value.topics)
  };
}

function toCandidate(repository: RepositoryRecord): RecommendationCandidate {
  return {
    repoId: repository.id,
    fullName: repository.fullName,
    language: repository.language,
    topics: toStringArray(repository.topics),
    readinessScore: toNumber(repository.readinessScore),
    stars: repository.stars,
    openIssues: repository.openIssues,
    description: repository.description
  };
}

function toStringArray(value: unknown): JsonArray {
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
