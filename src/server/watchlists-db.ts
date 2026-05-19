import type { Plan, RepoWithScore, Watchlist } from "@/domain/types";
import { mapRepositoryRecord } from "./repository-mappers";

const FREE_WATCHLIST_LIMIT = 3;
const FREE_REPO_LIMIT = 20;

type WatchlistClient = {
  watchlist: {
    count?: (args?: any) => Promise<number>;
    create?: (args?: any) => Promise<any>;
    findFirst?: (args?: any) => Promise<any | null>;
  };
  repository?: {
    findMany: (args?: any) => Promise<Array<{ id: string }>>;
  };
};

type WatchlistRecord = {
  id: string;
  userId: string;
  name: string;
  description: string;
  filters: unknown;
  alertEnabled: boolean;
  digestFrequency: "daily" | "weekly";
  createdAt: Date;
  repos: Array<{
    repoId: string;
    repository?: Parameters<typeof mapRepositoryRecord>[0];
  }>;
};

type CreateWatchlistInput = Omit<Watchlist, "id" | "repoIds" | "createdAt" | "filters"> & {
  userPlan?: Plan;
  filters: Omit<Watchlist["filters"], "hasGoodFirstIssue"> & {
    hasGoodFirstIssue?: boolean;
  };
};

type CreateWatchlistResponse =
  | {
      status: 201;
      data: { watchlist: Watchlist };
      error?: never;
    }
  | {
      status: 400 | 403;
      data?: never;
      error: { code: "INVALID_WATCHLIST_NAME" | "FREE_WATCHLIST_LIMIT_REACHED"; message: string };
    };

type WatchlistReposResponse =
  | {
      status: 200;
      data: {
        watchlist: Watchlist;
        repos: RepoWithScore[];
        total: number;
        filters_applied: Watchlist["filters"];
      };
      error?: never;
    }
  | {
      status: 404;
      data?: never;
      error: { code: "WATCHLIST_NOT_FOUND"; message: string };
    };

export async function createWatchlistInDb(
  client: WatchlistClient,
  input: CreateWatchlistInput
): Promise<CreateWatchlistResponse> {
  const name = input.name.trim();

  if (name.length === 0) {
    return {
      status: 400,
      error: { code: "INVALID_WATCHLIST_NAME", message: "Watchlist name is required." }
    };
  }

  const userPlan = input.userPlan ?? "free";
  const existingCount = await client.watchlist.count?.({ where: { userId: input.userId } });

  if (userPlan === "free" && (existingCount ?? 0) >= FREE_WATCHLIST_LIMIT) {
    return {
      status: 403,
      error: {
        code: "FREE_WATCHLIST_LIMIT_REACHED",
        message: "Free users can create up to 3 watchlists."
      }
    };
  }

  if (!client.repository?.findMany || !client.watchlist.create) {
    throw new Error("repository.findMany and watchlist.create are required.");
  }

  const filters = normalizeFilters(input.filters);
  const candidateRepos = await client.repository.findMany({
    where: repositoryWhereForFilters(filters),
    orderBy: { readinessScore: "desc" },
    take: userPlan === "free" ? FREE_REPO_LIMIT : 100
  });
  const repoIds = candidateRepos.map((repo) => repo.id).slice(0, userPlan === "free" ? FREE_REPO_LIMIT : candidateRepos.length);
  const record = await client.watchlist.create({
    data: {
      userId: input.userId,
      name,
      description: input.description,
      filters,
      alertEnabled: input.alertEnabled,
      digestFrequency: input.digestFrequency,
      repos: {
        create: repoIds.map((repoId) => ({ repoId }))
      }
    },
    include: {
      repos: true
    }
  });

  return {
    status: 201,
    data: {
      watchlist: mapWatchlistRecord(record)
    }
  };
}

export async function getWatchlistReposFromDb(
  client: WatchlistClient,
  id: string,
  userId: string
): Promise<WatchlistReposResponse> {
  const record = await client.watchlist.findFirst?.({
    where: { id, userId },
    include: {
      repos: {
        include: {
          repository: {
            include: {
              issues: {
                select: { state: true, labels: true }
              }
            }
          }
        }
      }
    }
  });

  if (!record) {
    return {
      status: 404,
      error: { code: "WATCHLIST_NOT_FOUND", message: `Watchlist ${id} was not found.` }
    };
  }

  const watchlist = mapWatchlistRecord(record);
  const repos = (record.repos as WatchlistRecord["repos"])
    .map((repo) => repo.repository)
    .filter((repo): repo is Parameters<typeof mapRepositoryRecord>[0] => repo !== undefined)
    .map(mapRepositoryRecord);

  return {
    status: 200,
    data: {
      watchlist,
      repos,
      total: repos.length,
      filters_applied: watchlist.filters
    }
  };
}

function mapWatchlistRecord(record: WatchlistRecord): Watchlist {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    description: record.description,
    filters: normalizeFilters(record.filters),
    alertEnabled: record.alertEnabled,
    digestFrequency: record.digestFrequency,
    repoIds: record.repos.map((repo) => repo.repoId),
    createdAt: record.createdAt.toISOString()
  };
}

function normalizeFilters(value: unknown): Watchlist["filters"] {
  const filters = value && typeof value === "object" ? (value as Partial<Watchlist["filters"]>) : {};

  return {
    languages: normalizeStringList(filters.languages),
    topics: normalizeStringList(filters.topics),
    minScore: clampScore(filters.minScore),
    hasGoodFirstIssue: filters.hasGoodFirstIssue === true
  };
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0))];
}

function clampScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

function repositoryWhereForFilters(filters: Watchlist["filters"]) {
  const where: Record<string, unknown> = {};

  if (filters.languages.length > 0) {
    where.language = { in: filters.languages };
  }

  if (filters.topics.length > 0) {
    where.AND = filters.topics.map((topic) => ({ topics: { array_contains: topic } }));
  }

  where.readinessScore = { gte: filters.minScore };

  if (filters.hasGoodFirstIssue) {
    where.issues = { some: { state: "open", labels: { array_contains: "good first issue" } } };
  }

  return where;
}
