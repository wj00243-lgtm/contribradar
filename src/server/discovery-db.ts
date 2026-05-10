import type { DiscoverReposQuery, RepoWithScore, ScoreComponent, SortMode } from "@/domain/types";
import { mapRepositoryRecord } from "./repository-mappers";

const FIXED_NOW = new Date("2026-05-06T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type RepositoryClient = {
  repository: {
    findMany?: (args?: any) => Promise<unknown[]>;
    count?: (args?: any) => Promise<number>;
    findFirst?: (args?: any) => Promise<unknown | null>;
  };
};

type RepositoryFacets = {
  languages: string[];
  topics: string[];
};

type RepositoryScoreResponse =
  | {
      status: 200;
      data: {
        repository: RepoWithScore;
        readiness_score: number;
        confidence: number;
        breakdown: ScoreComponent[];
        explanation: string;
        warnings: string[];
      };
      error?: never;
    }
  | {
      status: 404;
      data?: never;
      error: {
        code: "REPOSITORY_NOT_FOUND";
        message: string;
      };
    };

export async function discoverRepositoriesFromDb(
  client: RepositoryClient,
  query: Partial<DiscoverReposQuery> = {}
): Promise<{ repos: RepoWithScore[]; total: number; facets: RepositoryFacets }> {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const where = repositoryWhere(query);
  const orderBy = repositoryOrderBy(query.sort ?? "score");
  const include = {
    issues: {
      select: {
        state: true,
        labels: true
      }
    }
  };
  const [records, total, facetRecords] = await Promise.all([
    client.repository.findMany?.({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include
    }) ?? Promise.resolve([]),
    client.repository.count?.({ where }) ?? Promise.resolve(0),
    client.repository.findMany?.({
      select: { language: true, topics: true }
    }) ?? Promise.resolve([])
  ]);

  return {
    repos: records.map((record) => mapRepositoryRecord(record as Parameters<typeof mapRepositoryRecord>[0])),
    total,
    facets: repositoryFacets(facetRecords)
  };
}

export async function getRepositoryScoreFromDb(
  client: RepositoryClient,
  owner: string,
  repoName: string
): Promise<RepositoryScoreResponse> {
  if (!client.repository.findFirst) {
    return notFound(owner, repoName);
  }

  const record = await client.repository.findFirst({
    where: {
      owner: { equals: owner, mode: "insensitive" },
      name: { equals: repoName, mode: "insensitive" }
    },
    include: {
      issues: {
        select: {
          state: true,
          labels: true
        }
      }
    }
  });

  if (!record) {
    return notFound(owner, repoName);
  }

  const repository = mapRepositoryRecord(record as Parameters<typeof mapRepositoryRecord>[0]);

  return {
    status: 200,
    data: {
      repository,
      readiness_score: repository.readiness.score,
      confidence: repository.readiness.confidence,
      breakdown: repository.readiness.breakdown,
      explanation: repository.readiness.explanation,
      warnings: repository.readiness.warnings
    }
  };
}

function repositoryWhere(query: Partial<DiscoverReposQuery>) {
  const where: Record<string, unknown> = {};

  if (query.language) {
    where.language = { equals: query.language, mode: "insensitive" };
  }

  if (query.topics && query.topics.length > 0) {
    where.AND = query.topics.map((topic) => ({ topics: { array_contains: topic } }));
  }

  if (query.minScore !== undefined) {
    where.readinessScore = { gte: query.minScore };
  }

  if (query.lastActiveWithinDays !== undefined) {
    where.lastCommitAt = {
      gte: new Date(FIXED_NOW.getTime() - query.lastActiveWithinDays * MS_PER_DAY)
    };
  }

  if (query.hasGoodFirstIssue !== undefined) {
    where.issues = query.hasGoodFirstIssue
      ? { some: { state: "open", labels: { array_contains: "good first issue" } } }
      : { none: { state: "open", labels: { array_contains: "good first issue" } } };
  }

  return where;
}

function repositoryOrderBy(sort: SortMode) {
  switch (sort) {
    case "stars":
      return { stars: "desc" };
    case "activity":
      return { lastCommitAt: "desc" };
    case "response_time":
      return { metricMaintainerResponseHours: "asc" };
    case "score":
      return { readinessScore: "desc" };
  }
}

function repositoryFacets(records: unknown[]): RepositoryFacets {
  const typedRecords = records as Array<{ language: string; topics: unknown }>;

  return {
    languages: [...new Set(typedRecords.map((record) => record.language))].sort(),
    topics: [...new Set(typedRecords.flatMap((record) => toStringArray(record.topics)))].sort()
  };
}

function normalizePage(page?: number): number {
  return page === undefined || !Number.isFinite(page) ? 1 : Math.max(1, Math.floor(page));
}

function normalizeLimit(limit?: number): number {
  return limit === undefined || !Number.isFinite(limit) ? 20 : Math.min(100, Math.max(1, Math.floor(limit)));
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function notFound(owner: string, repoName: string): RepositoryScoreResponse {
  return {
    status: 404,
    error: {
      code: "REPOSITORY_NOT_FOUND",
      message: `Repository ${owner}/${repoName} was not found.`
    }
  };
}
