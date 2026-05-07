import { beforeEach, describe, expect, it } from "vitest";
import { createWatchlist, getWatchlistRepos, resetWatchlistsForTests } from "./watchlists";

describe("watchlists", () => {
  beforeEach(() => {
    resetWatchlistsForTests();
  });

  it("creates a watchlist with filters and matching repositories", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: " Python beginner targets ",
      description: "Repos for first OSS contribution",
      filters: {
        languages: ["Python"],
        topics: ["data-science"],
        minScore: 70
      },
      alertEnabled: true,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(201);
    expect(result.data).toBeDefined();

    const watchlist = result.data?.watchlist;

    expect(watchlist?.id).toBe("watchlist_1");
    expect(watchlist?.name).toBe("Python beginner targets");
    expect(watchlist?.createdAt).toBe("2026-05-06T00:00:00.000Z");
    expect(watchlist?.repoIds).toContain("repo_pandas");

    const repos = getWatchlistRepos(watchlist?.id ?? "");
    expect(repos.status).toBe(200);
    expect(repos.data).toBeDefined();
    expect(repos.data?.repos[0].fullName).toBe("pandas-dev/pandas");
    expect(repos.data?.filters_applied).toEqual(watchlist?.filters);
    expect(repos.data?.repos.map((repo) => repo.id)).toEqual(watchlist?.repoIds);
    expect(repos.data?.total).toBe(repos.data?.repos.length);
  });

  it("rejects blank watchlist names", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: " ",
      description: "",
      filters: {
        languages: [],
        topics: [],
        minScore: 75
      },
      alertEnabled: false,
      digestFrequency: "daily"
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe("INVALID_WATCHLIST_NAME");
  });

  it("returns not found for missing watchlists", () => {
    const result = getWatchlistRepos("missing");

    expect(result.status).toBe(404);
    expect(result.error?.code).toBe("WATCHLIST_NOT_FOUND");
  });
});
