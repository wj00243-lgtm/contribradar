import { jsonError, jsonOk } from "@/server/http";
import { getWatchlistReposFromDb } from "@/server/watchlists-db";

type SessionLike = {
  user?: {
    id?: string;
    plan?: string;
  };
} | null;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type Dependencies = {
  auth: () => Promise<SessionLike>;
  client: Parameters<typeof getWatchlistReposFromDb>[0] | unknown;
  getWatchlistRepos: typeof getWatchlistReposFromDb;
};

export function createWatchlistReposGetHandler({
  auth: getSession,
  client,
  getWatchlistRepos
}: Dependencies) {
  return async function GET(_request: Request, context: RouteContext) {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to view watchlist repositories.");
    }

    const { id } = await context.params;
    const result = await getWatchlistRepos(
      client as Parameters<typeof getWatchlistReposFromDb>[0],
      id,
      userId
    );

    if (result.error !== undefined) {
      return jsonError(result.status, result.error.code, result.error.message);
    }

    return jsonOk(result.data);
  };
}
