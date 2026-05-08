import { getWatchlistRepos } from "@/server/watchlists";
import { jsonError, jsonOk } from "@/server/http";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = getWatchlistRepos(id);

  if (result.error !== undefined) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data);
}
