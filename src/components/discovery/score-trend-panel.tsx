"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

import { ProGate } from "@/components/pro/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RepoWithScore } from "@/domain/types";

type ScoreTrendPoint = {
  date: string;
  score: number;
};

type ScoreTrendAnnotation = {
  date: string;
  message: string;
};

type ScoreTrendResponse = {
  points: ScoreTrendPoint[];
  annotations: ScoreTrendAnnotation[];
};

type ScoreTrendPanelProps = {
  repo: RepoWithScore;
  userPlan?: string | null;
};

export function ScoreTrendPanel({ repo, userPlan }: ScoreTrendPanelProps) {
  const [points, setPoints] = useState<ScoreTrendPoint[]>([]);
  const [annotations, setAnnotations] = useState<ScoreTrendAnnotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const path = `/api/v1/discover/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/score/trend`;
  const sparkline = useMemo(() => buildSparkline(points), [points]);

  useEffect(() => {
    let isMounted = true;

    async function loadTrend() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(path);
        const body = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setError(body.error?.message ?? "Score trend could not be loaded.");
          return;
        }

        const payload = body as ScoreTrendResponse;
        setPoints(payload.points);
        setAnnotations(payload.annotations);
      } catch {
        if (isMounted) {
          setError("Score trend could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTrend();

    return () => {
      isMounted = false;
    };
  }, [path]);

  return (
    <ProGate featureName="scoreTrends" userPlan={userPlan}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                Score trend
              </CardTitle>
              <CardDescription>Last 30 days of readiness movement for {repo.fullName}.</CardDescription>
            </div>
            <Badge variant="outline">{points.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}
          {isLoading ? <p className="text-sm text-zinc-500">Loading trend...</p> : null}
          {!isLoading && !error && points.length === 0 ? <p className="text-sm text-zinc-500">No score trend data yet.</p> : null}
          {points.length > 0 ? (
            <div className="space-y-4">
              <div className="flex h-24 items-end gap-1 rounded border border-zinc-800 bg-zinc-900/60 p-3">
                {sparkline.map((height, index) => (
                  <div
                    aria-label={`${points[index].date}: ${points[index].score}`}
                    className="min-w-4 flex-1 rounded-t bg-emerald-400"
                    key={`${points[index].date}-${index}`}
                    style={{ height: `${height}%` }}
                    title={`${points[index].date}: ${points[index].score}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <TrendStat label="First" value={`${points[0].score}`} />
                <TrendStat label="Latest" value={`${points[points.length - 1].score}`} />
              </div>
              {annotations.length > 0 ? (
                <div className="space-y-2">
                  {annotations.map((annotation) => (
                    <p className="rounded border border-zinc-800 bg-zinc-900/60 p-3 text-xs leading-5 text-zinc-300" key={annotation.date}>
                      {annotation.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ProGate>
  );
}

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function buildSparkline(points: ScoreTrendPoint[]): number[] {
  if (points.length === 0) {
    return [];
  }

  const scores = points.map((point) => point.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(max - min, 1);

  return scores.map((score) => 20 + ((score - min) / range) * 80);
}
