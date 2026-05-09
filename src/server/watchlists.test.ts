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

  it("applies multiple language filters with OR semantics", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: "Python and Rust beginner targets",
      description: "Repos across preferred languages",
      filters: {
        languages: ["Python", "Rust"],
        topics: [],
        minScore: 70
      },
      alertEnabled: true,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(201);
    expect(result.data).toBeDefined();

    const watchlist = result.data?.watchlist;

    expect(watchlist?.filters.languages).toEqual(["Python", "Rust"]);
    expect(watchlist?.repoIds).toEqual(expect.arrayContaining(["repo_pandas", "repo_tracing"]));

    const repos = getWatchlistRepos(watchlist?.id ?? "");
    const repoIds = repos.data?.repos.map((repo) => repo.id) ?? [];

    expect(repos.status).toBe(200);
    expect(repos.data?.filters_applied.languages).toEqual(["Python", "Rust"]);
    expect(repoIds).toEqual(expect.arrayContaining(["repo_pandas", "repo_tracing"]));
    expect(repoIds).toEqual(watchlist?.repoIds);
  });

  it("applies good first issue filters when creating and reading repositories", () => {
    const result = createWatchlist({
      userId: "user_demo",
      name: "Good first only",
      description: "Repos with starter issues",
      filters: {
        languages: [],
        topics: [],
        minScore: 0,
        hasGoodFirstIssue: true
      },
      alertEnabled: false,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(201);

    const watchlist = result.data?.watchlist;
    expect(watchlist?.filters.hasGoodFirstIssue).toBe(true);
    expect(watchlist?.repoIds.length).toBeGreaterThan(0);

    const repos = getWatchlistRepos(watchlist?.id ?? "");
    const savedRepos = repos.data?.repos ?? [];

    expect(repos.status).toBe(200);
    expect(repos.data?.filters_applied).toEqual(watchlist?.filters);
    expect(savedRepos.length).toBe(watchlist?.repoIds.length);
    expect(savedRepos.every((repo) => repo.hasGoodFirstIssue)).toBe(true);
    expect(savedRepos.map((repo) => repo.id)).toEqual(watchlist?.repoIds);
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

  it("limits free users to three watchlists", () => {
    for (const index of [1, 2, 3]) {
      expect(
        createWatchlist({
          userId: "user_demo",
          userPlan: "free",
          name: `List ${index}`,
          description: "",
          filters: { languages: [], topics: [], minScore: 0 },
          alertEnabled: false,
          digestFrequency: "weekly"
        }).status
      ).toBe(201);
    }

    const result = createWatchlist({
      userId: "user_demo",
      userPlan: "free",
      name: "List 4",
      description: "",
      filters: { languages: [], topics: [], minScore: 0 },
      alertEnabled: false,
      digestFrequency: "weekly"
    });

    expect(result.status).toBe(403);
    expect(result.error?.code).toBe("FREE_WATCHLIST_LIMIT_REACHED");
  });

  it("caps free watchlists at twenty repositories but leaves pro uncapped", () => {
    const freeResult = createWatchlist({
      userId: "free_user",
      userPlan: "free",
      name: "Free list",
      description: "",
      filters: { languages: [], topics: [], minScore: 0 },
      alertEnabled: false,
      digestFrequency: "weekly",
      candidateRepoIds: Array.from({ length: 25 }, (_, index) => `repo_${index}`)
    });
    const proResult = createWatchlist({
      userId: "pro_user",
      userPlan: "pro",
      name: "Pro list",
      description: "",
      filters: { languages: [], topics: [], minScore: 0 },
      alertEnabled: false,
      digestFrequency: "weekly",
      candidateRepoIds: Array.from({ length: 25 }, (_, index) => `repo_${index}`)
    });

    expect(freeResult.data?.watchlist.repoIds).toHaveLength(20);
    expect(proResult.data?.watchlist.repoIds).toHaveLength(25);
  });
});
