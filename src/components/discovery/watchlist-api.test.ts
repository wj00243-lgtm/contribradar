import { describe, expect, it } from "vitest";

import { buildWatchlistRequest } from "./watchlist-api";

describe("buildWatchlistRequest", () => {
  it("builds the dashboard watchlist payload expected by the API", () => {
    expect(
      buildWatchlistRequest({
        name: "  Current discovery targets  ",
        filters: {
          languages: [],
          topics: [],
          minScore: 50,
          hasGoodFirstIssue: true
        }
      })
    ).toEqual({
      userId: "user_demo",
      name: "Current discovery targets",
      description: "Saved from the discovery dashboard.",
      filters: {
        languages: [],
        topics: [],
        minScore: 50,
        hasGoodFirstIssue: true
      },
      alertEnabled: false,
      digestFrequency: "weekly"
    });
  });
});
