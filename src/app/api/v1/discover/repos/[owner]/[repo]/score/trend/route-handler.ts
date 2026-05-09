import { hasFeature } from "@/lib/features";
import { jsonError, jsonOk } from "@/server/http";
import { getRepositoryScoreTrend, type ScoreTrendClient } from "@/server/score-trends";

type SessionLike = {
  user?: {
    id?: string;
    plan?: string;
  };
} | null;

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

type Dependencies = {
  auth: () => Promise<SessionLike>;
  client: ScoreTrendClient | unknown;
  getScoreTrend: typeof getRepositoryScoreTrend;
};

export function createScoreTrendGetHandler({ auth: getSession, client, getScoreTrend }: Dependencies) {
  return async function GET(_request: Request, context: RouteContext) {
    const session = await getSession();

    if (!session?.user?.id) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to view score trends.");
    }

    if (!hasFeature(session.user.plan, "scoreTrends")) {
      return jsonError(403, "PRO_FEATURE_REQUIRED", "Score trends require a Pro plan.");
    }

    const { owner, repo } = await context.params;
    const result = await getScoreTrend(client as ScoreTrendClient, owner, repo);

    if (result.error) {
      return jsonError(result.status, result.error.code, result.error.message);
    }

    return jsonOk(result.data);
  };
}
