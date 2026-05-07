import { beforeEach, describe, expect, it } from "vitest";
import { createWatchlist, getWatchlistRepos, resetWatchlistsForTests } from "./watchlists";

describe("watchlists", () => {
  beforeEach(() => {
    resetWatchlistsForTests();
  });

  it("creates a watchlist with filters and matching repositories", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: "Python beginner targets",
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
    expect(result.data?.watchlist.name).toBe("Python beginner targets");

    const repos = getWatchlistRepos(result.data?.watchlist.id ?? "");
    expect(repos.status).toBe(200);
    expect(repos.data?.repos[0].fullName).toBe("pandas-dev/pandas");
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
});
