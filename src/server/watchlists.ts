import type { DiscoverReposQuery, RepoWithScore, Watchlist } from "@/domain/types";
import { discoverRepositories } from "./discovery";

const CREATED_AT = "2026-05-06T00:00:00.000Z";

const watchlists = new Map<string, Watchlist>();

type CreateWatchlistInput = Omit<Watchlist, "id" | "repoIds" | "createdAt">;

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

function discoveryQueryForWatchlist(watchlist: Pick<Watchlist, "filters">): DiscoverReposQuery {
  return {
    language: watchlist.filters.languages[0],
    topics: [...watchlist.filters.topics],
    minScore: watchlist.filters.minScore,
    sort: "score",
    page: 1,
    limit: 100
  };
}

function cloneWatchlistFilters(filters: Watchlist["filters"]): Watchlist["filters"] {
  return {
    languages: [...filters.languages],
    topics: [...filters.topics],
    minScore: filters.minScore
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

  const filters = {
    languages: [...input.filters.languages],
    topics: [...input.filters.topics],
    minScore: input.filters.minScore
  };
  const repoIds = discoverRepositories(discoveryQueryForWatchlist({ filters })).repos.map(
    (repo) => repo.id
  );
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

  const filtersApplied = discoveryQueryForWatchlist(watchlist);
  const watchlistRepoIds = new Set(watchlist.repoIds);
  const repos = discoverRepositories(filtersApplied).repos.filter((repo) =>
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
