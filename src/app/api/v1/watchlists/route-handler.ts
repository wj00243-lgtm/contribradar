import { z } from "zod";

import type { Plan } from "@/domain/types";
import { normalizePlan } from "@/lib/features";
import { jsonError, jsonOk } from "@/server/http";
import { createWatchlistInDb } from "@/server/watchlists-db";

type SessionLike = {
  user?: {
    id?: string;
    plan?: string;
  };
} | null;

type Dependencies = {
  auth: () => Promise<SessionLike>;
  client: Parameters<typeof createWatchlistInDb>[0] | unknown;
  createWatchlist: typeof createWatchlistInDb;
};

const watchlistRequestSchema = z.object({
  name: z.string(),
  description: z.string().default(""),
  filters: z.object({
    languages: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    minScore: z.number().min(0).max(100).default(70),
    hasGoodFirstIssue: z.boolean().default(false)
  }),
  alertEnabled: z.boolean().default(false),
  digestFrequency: z.enum(["daily", "weekly"]).default("weekly")
});

export function createWatchlistsPostHandler({
  auth: getSession,
  client,
  createWatchlist
}: Dependencies) {
  return async function POST(request: Request) {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to create watchlists.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = watchlistRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "INVALID_WATCHLIST_REQUEST",
        "Watchlist request is invalid.",
        parsed.error.flatten()
      );
    }

    const result = await createWatchlist(client as Parameters<typeof createWatchlistInDb>[0], {
      ...parsed.data,
      userId,
      userPlan: normalizePlan(session.user?.plan) as Plan
    });

    if (result.error !== undefined) {
      return jsonError(result.status, result.error.code, result.error.message);
    }

    return jsonOk(result.data, 201);
  };
}
