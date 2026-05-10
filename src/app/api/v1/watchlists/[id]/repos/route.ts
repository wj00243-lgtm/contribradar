import { getWatchlistRepos } from "@/server/watchlists";
import { getWatchlistReposFromDb } from "@/server/watchlists-db";
import { jsonError, jsonOk } from "@/server/http";
import { prisma } from "@/server/db";
import { shouldAllowSeedFallback } from "@/server/persistence-mode";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const dbResult = await getWatchlistReposFromDb(prisma, id, "user_demo").catch(() => null);
  const result =
    dbResult && (dbResult.status === 200 || !shouldAllowSeedFallback())
      ? dbResult
      : getWatchlistRepos(id);

  if (result.error !== undefined) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data);
}
