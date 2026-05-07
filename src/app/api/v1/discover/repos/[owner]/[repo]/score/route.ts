import { getRepositoryScore } from "@/server/discovery";
import { jsonError, jsonOk } from "@/server/http";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { owner, repo } = await context.params;
  const result = getRepositoryScore(owner, repo);

  if (result.error !== undefined) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data);
}
