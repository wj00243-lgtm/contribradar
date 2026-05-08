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
          minScore: 50
        }
      })
    ).toEqual({
      userId: "user_demo",
      name: "Current discovery targets",
      description: "Saved from the discovery dashboard.",
      filters: {
        languages: [],
        topics: [],
        minScore: 50
      },
      alertEnabled: false,
      digestFrequency: "weekly"
    });
  });
});
