import { describe, expect, it, vi } from "vitest";

import type { Watchlist } from "@/domain/types";
import { createWatchlistsPostHandler } from "./route-handler";

const baseRequest = {
  name: "React shortlist",
  description: "Repos for frontend contributions",
  filters: {
    languages: ["TypeScript"],
    topics: ["react"],
    minScore: 70,
    hasGoodFirstIssue: true
  },
  alertEnabled: true,
  digestFrequency: "weekly"
};

const watchlist: Watchlist = {
  id: "watchlist_1",
  userId: "user_session",
  name: "React shortlist",
  description: "Repos for frontend contributions",
  filters: baseRequest.filters,
  alertEnabled: true,
  digestFrequency: "weekly",
  repoIds: ["repo_1"],
  createdAt: "2026-05-10T00:00:00.000Z"
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/v1/watchlists", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("POST /api/v1/watchlists", () => {
  it("rejects anonymous watchlist creation before reading the body", async () => {
    const createWatchlist = vi.fn();
    const POST = createWatchlistsPostHandler({
      auth: async () => null,
      client: {},
      createWatchlist
    });

    const response = await POST(postRequest(baseRequest));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
    expect(createWatchlist).not.toHaveBeenCalled();
  });

  it("uses the Auth.js session user instead of request body user fields", async () => {
    const createWatchlist = vi.fn(async () => ({
      status: 201 as const,
      data: { watchlist }
    }));
    const POST = createWatchlistsPostHandler({
      auth: async () => ({
        user: {
          id: "user_session",
          plan: "pro"
        }
      }),
      client: { watchlist: {}, repository: {} },
      createWatchlist
    });

    const response = await POST(
      postRequest({
        ...baseRequest,
        userId: "user_attacker",
        userPlan: "team"
      })
    );

    expect(response.status).toBe(201);
    expect(createWatchlist).toHaveBeenCalledWith(
      { watchlist: {}, repository: {} },
      {
        ...baseRequest,
        userId: "user_session",
        userPlan: "pro"
      }
    );
  });

  it("maps DB watchlist limit errors to the route response", async () => {
    const POST = createWatchlistsPostHandler({
      auth: async () => ({
        user: {
          id: "user_session",
          plan: "free"
        }
      }),
      client: {},
      createWatchlist: async () => ({
        status: 403 as const,
        error: {
          code: "FREE_WATCHLIST_LIMIT_REACHED" as const,
          message: "Free users can create up to 3 watchlists."
        }
      })
    });

    const response = await POST(postRequest(baseRequest));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FREE_WATCHLIST_LIMIT_REACHED");
  });
});
