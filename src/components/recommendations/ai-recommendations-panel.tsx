"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { ProGate } from "@/components/pro/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AiRecommendation = {
  repoId: string;
  fullName: string;
  fitScore: number;
  reason: string;
  suggestedIssueSearch?: string;
};

type UsageMeter = {
  used: number;
  limit: number;
  remaining: number;
  period: string;
};

type RecommendationResponse = {
  recommendations: AiRecommendation[];
  usage: UsageMeter;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type AiRecommendationsPanelProps = {
  userPlan?: string | null;
};

export function AiRecommendationsPanel({ userPlan }: AiRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [usage, setUsage] = useState<UsageMeter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateRecommendations() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/recommendations", {
        method: "POST"
      });
      const body = (await response.json()) as RecommendationResponse | ApiErrorResponse;

      if (!response.ok) {
        setError(formatRecommendationError(body as ApiErrorResponse));
        return;
      }

      const payload = body as RecommendationResponse;
      setRecommendations(payload.recommendations);
      setUsage(payload.usage);
    } catch {
      setError("Recommendations could not be generated. Check network connectivity and retry.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ProGate featureName="aiRecommendations" userPlan={userPlan}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                AI recommendations
              </CardTitle>
              <CardDescription>Personalized Pro picks from your skills, activity, and watchlists.</CardDescription>
            </div>
            <Badge variant="outline">{usage ? `${usage.used}/${usage.limit}` : "0/20"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled={isLoading} onClick={generateRecommendations} type="button">
            {isLoading ? "Generating..." : "Generate recommendations"}
          </Button>

          {error ? <p className="mt-3 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

          <p className="mt-3 text-xs text-zinc-500">
            {usage
              ? `${usage.remaining} AI recommendation calls remaining for ${usage.period}.`
              : "Pro users get 20 AI recommendation calls per month."}
          </p>

          {recommendations.length > 0 ? (
            <div className="mt-4 space-y-3">
              {recommendations.map((recommendation) => (
                <article key={recommendation.repoId} className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{recommendation.fullName}</h3>
                    <Badge>{recommendation.fitScore}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-zinc-400">{recommendation.reason}</p>
                  {recommendation.suggestedIssueSearch ? (
                    <p className="mt-2 text-xs text-emerald-300">{recommendation.suggestedIssueSearch}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No recommendations generated yet.</p>
          )}
        </CardContent>
      </Card>
    </ProGate>
  );
}

function formatRecommendationError(body: ApiErrorResponse): string {
  switch (body.error?.code) {
    case "GEMINI_NOT_CONFIGURED":
      return "Gemini is not configured. Set GEMINI_API_KEY in Vercel and redeploy.";
    case "GEMINI_RESPONSE_INVALID":
      return "Gemini returned an unusable response. Retry once; if it repeats, review the prompt and Vercel logs.";
    case "AI_RECOMMENDATION_QUOTA_EXHAUSTED":
      return "Monthly AI recommendation quota is exhausted.";
    case "PRO_FEATURE_REQUIRED":
      return "AI recommendations require a Pro plan. Logout and login again after plan changes.";
    case "AUTH_REQUIRED":
      return "Login is required to generate AI recommendations.";
    default:
      return body.error?.message ?? "Recommendations could not be generated.";
  }
}

export const __testables = {
  formatRecommendationError
};
