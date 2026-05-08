import { z } from "zod";

import { createWatchlist } from "@/server/watchlists";
import { jsonError, jsonOk } from "@/server/http";

const watchlistRequestSchema = z.object({
  userId: z.string().min(1).default("user_demo"),
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

export async function POST(request: Request) {
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

  const result = createWatchlist(parsed.data);

  if (result.error !== undefined) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data, 201);
}
