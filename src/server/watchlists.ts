import type { DiscoverReposQuery, Plan, RepoWithScore, Watchlist } from "@/domain/types";
import { discoverRepositories } from "./discovery";

const CREATED_AT = "2026-05-06T00:00:00.000Z";
const FREE_WATCHLIST_LIMIT = 3;
const FREE_REPO_LIMIT = 20;

const watchlists = new Map<string, Watchlist>();

type CreateWatchlistInput = Omit<Watchlist, "id" | "repoIds" | "createdAt" | "filters"> & {
  userPlan?: Plan;
  candidateRepoIds?: string[];
  filters: Omit<Watchlist["filters"], "hasGoodFirstIssue"> & {
    hasGoodFirstIssue?: boolean;
  };
};

type CreateWatchlistResponse =
  | {
      status: 201;
      data: {
        watchlist: Watchlist;
      };
      error?: never;
    }
  | {
      status: 400;
      data?: never;
      error: {
        code: "INVALID_WATCHLIST_NAME";
        message: string;
      };
    }
  | {
      status: 403;
      data?: never;
      error: {
        code: "FREE_WATCHLIST_LIMIT_REACHED";
        message: string;
      };
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
      error: {
        code: "WATCHLIST_NOT_FOUND";
        message: string;
      };
    };

function baseDiscoveryQueryForWatchlist(
  watchlist: Pick<Watchlist, "filters">
): Omit<DiscoverReposQuery, "language"> {
  return {
    topics: [...watchlist.filters.topics],
    minScore: watchlist.filters.minScore,
    hasGoodFirstIssue: watchlist.filters.hasGoodFirstIssue ? true : undefined,
    sort: "score",
    page: 1,
    limit: 100
  };
}

function discoverWatchlistRepos(watchlist: Pick<Watchlist, "filters">): RepoWithScore[] {
  const query = baseDiscoveryQueryForWatchlist(watchlist);

  if (watchlist.filters.languages.length === 0) {
    return discoverRepositories(query).repos;
  }

  const reposById = new Map<string, RepoWithScore>();

  for (const language of watchlist.filters.languages) {
    for (const repo of discoverRepositories({ ...query, language }).repos) {
      reposById.set(repo.id, repo);
    }
  }

  return [...reposById.values()].sort(
    (left, right) => right.readiness.score - left.readiness.score
  );
}

function cloneWatchlistFilters(filters: Watchlist["filters"]): Watchlist["filters"] {
  return {
    languages: [...filters.languages],
    topics: [...filters.topics],
    minScore: filters.minScore,
    hasGoodFirstIssue: filters.hasGoodFirstIssue
  };
}

function cloneWatchlist(watchlist: Watchlist): Watchlist {
  return {
    ...watchlist,
    filters: cloneWatchlistFilters(watchlist.filters),
    repoIds: [...watchlist.repoIds]
  };
}

export function createWatchlist(input: CreateWatchlistInput): CreateWatchlistResponse {
  const name = input.name.trim();

  if (name.length === 0) {
    return {
      status: 400,
      error: {
        code: "INVALID_WATCHLIST_NAME",
        message: "Watchlist name is required."
      }
    };
  }

  const userPlan = input.userPlan ?? "free";

  if (userPlan === "free" && countUserWatchlists(input.userId) >= FREE_WATCHLIST_LIMIT) {
    return {
      status: 403,
      error: {
        code: "FREE_WATCHLIST_LIMIT_REACHED",
        message: "Free users can create up to 3 watchlists."
      }
    };
  }

  const filters = {
    languages: [...input.filters.languages],
    topics: [...input.filters.topics],
    minScore: input.filters.minScore,
    hasGoodFirstIssue: input.filters.hasGoodFirstIssue ?? false
  };
  const discoveredRepoIds = input.candidateRepoIds ?? discoverWatchlistRepos({ filters }).map((repo) => repo.id);
  const repoIds = userPlan === "free" ? discoveredRepoIds.slice(0, FREE_REPO_LIMIT) : discoveredRepoIds;
  const watchlist: Watchlist = {
    id: `watchlist_${watchlists.size + 1}`,
    userId: input.userId,
    name,
    description: input.description,
    filters,
    alertEnabled: input.alertEnabled,
    digestFrequency: input.digestFrequency,
    repoIds,
    createdAt: CREATED_AT
  };

  watchlists.set(watchlist.id, watchlist);

  return {
    status: 201,
    data: {
      watchlist: cloneWatchlist(watchlist)
    }
  };
}

function countUserWatchlists(userId: string): number {
  return [...watchlists.values()].filter((watchlist) => watchlist.userId === userId).length;
}

export function getWatchlistRepos(id: string): WatchlistReposResponse {
  const watchlist = watchlists.get(id);

  if (watchlist === undefined) {
    return {
      status: 404,
      error: {
        code: "WATCHLIST_NOT_FOUND",
        message: `Watchlist ${id} was not found.`
      }
    };
  }

  const watchlistRepoIds = new Set(watchlist.repoIds);
  const repos = discoverWatchlistRepos(watchlist).filter((repo) =>
    watchlistRepoIds.has(repo.id)
  );

  return {
    status: 200,
    data: {
      watchlist: cloneWatchlist(watchlist),
      repos,
      total: repos.length,
      filters_applied: cloneWatchlistFilters(watchlist.filters)
    }
  };
}

export function resetWatchlistsForTests(): void {
  watchlists.clear();
}
