import { GeminiConfigurationError, GeminiResponseError } from "@/server/gemini";
import {
  generateAiRepoRecommendations,
  RecommendationPlanError,
  RecommendationQuotaError,
  RecommendationUserError,
  type RecommendationClient
} from "@/server/recommendations";
import { jsonError, jsonOk } from "@/server/http";

type SessionLike = {
  user?: {
    id?: string;
    plan?: string;
  };
} | null;

type HandlerDependencies = {
  auth: () => Promise<SessionLike>;
  client: RecommendationClient | unknown;
  apiKey?: string;
  generateRecommendations: typeof generateAiRepoRecommendations;
};

export function createRecommendationsPostHandler({
  auth: getSession,
  client,
  apiKey,
  generateRecommendations
}: HandlerDependencies) {
  return async function POST(_request: Request) {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to generate AI recommendations.");
    }

    try {
      const result = await generateRecommendations(client as RecommendationClient, userId, {
        apiKey
      });

      return jsonOk(result);
    } catch (error) {
      if (error instanceof RecommendationPlanError) {
        return jsonError(403, "PRO_FEATURE_REQUIRED", "AI recommendations require a Pro plan.");
      }

      if (error instanceof RecommendationQuotaError) {
        return jsonError(429, "AI_RECOMMENDATION_QUOTA_EXHAUSTED", "Monthly AI recommendation quota is exhausted.");
      }

      if (error instanceof RecommendationUserError) {
        return jsonError(404, "USER_NOT_FOUND", "The authenticated user was not found.");
      }

      if (error instanceof GeminiConfigurationError) {
        return jsonError(503, "GEMINI_NOT_CONFIGURED", "Gemini API key is not configured.");
      }

      if (error instanceof GeminiResponseError) {
        return jsonError(502, "GEMINI_RESPONSE_INVALID", "Gemini returned an invalid recommendation response.");
      }

      return jsonError(500, "AI_RECOMMENDATION_FAILED", "AI recommendations could not be generated.");
    }
  };
}
