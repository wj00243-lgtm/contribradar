import { getRepositoryScore } from "@/server/discovery";
import { getRepositoryScoreFromDb } from "@/server/discovery-db";
import { jsonError, jsonOk } from "@/server/http";
import { shouldAllowSeedFallback } from "@/server/persistence-mode";
import { prisma } from "@/server/db";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { owner, repo } = await context.params;
  const dbResult = await getRepositoryScoreFromDb(prisma, owner, repo).catch(() => null);
  const result =
    dbResult && (dbResult.status === 200 || !shouldAllowSeedFallback())
      ? dbResult
      : getRepositoryScore(owner, repo);

  if (result.error !== undefined) {
    return jsonError(result.status, result.error.code, result.error.message);
  }

  return jsonOk(result.data);
}
