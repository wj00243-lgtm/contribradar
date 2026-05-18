"use client";

import { GitBranch, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateTime,
  formatDuration,
  getRunStatusLabel,
  getRunStatusVariant,
  summarizeCronRuns,
  type CronRunView
} from "./cron-runs-formatting";
import {
  formatIngestionSummary,
  getIngestionStatusLabel,
  parseRepositoryInput,
  type GitHubIngestionResponse
} from "./github-ingestion-formatting";

type OpsResponse = {
  runs: CronRunView[];
};

export function CronRunsDashboard() {
  const [opsKey, setOpsKey] = useState("");
  const [runs, setRuns] = useState<CronRunView[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [repositoryInput, setRepositoryInput] = useState("");
  const [ingestionResult, setIngestionResult] = useState<GitHubIngestionResponse | null>(null);
  const [ingestionError, setIngestionError] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const summary = useMemo(() => summarizeCronRuns(runs), [runs]);
  const repositoriesToIngest = useMemo(() => parseRepositoryInput(repositoryInput), [repositoryInput]);

  async function loadRuns(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ops/cron-runs", {
        headers: {
          Authorization: `Bearer ${opsKey}`
        }
      });

      if (response.status === 401) {
        setRuns([]);
        setError("OPS_API_KEY rejected. Check the Vercel environment variable and the value entered here.");
        return;
      }

      if (response.status === 503) {
        setRuns([]);
        setError("OPS_API_KEY is not configured on the deployment. Add it in Vercel Environment Variables and redeploy.");
        return;
      }

      if (!response.ok) {
        setRuns([]);
        setError(`Ops API returned ${response.status}. Check production logs before retrying.`);
        return;
      }

      const body = (await response.json()) as OpsResponse;
      setRuns(body.runs ?? []);
    } catch (loadError) {
      setRuns([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load cron runs.");
    } finally {
      setIsLoading(false);
    }
  }

  async function ingestRepositories(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsIngesting(true);
    setIngestionError("");
    setIngestionResult(null);

    try {
      const response = await fetch("/api/ops/ingest-github", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opsKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repositories: repositoriesToIngest })
      });

      if (response.status === 401) {
        setIngestionError("OPS_API_KEY rejected. Check the key before ingesting GitHub data.");
        return;
      }

      if (response.status === 503) {
        setIngestionError("OPS_API_KEY is not configured on the deployment. Add it in Vercel Environment Variables and redeploy.");
        return;
      }

      if (!response.ok) {
        setIngestionError(`GitHub ingestion returned ${response.status}. Check production logs and retry.`);
        return;
      }

      setIngestionResult((await response.json()) as GitHubIngestionResponse);
    } catch (ingestError) {
      setIngestionError(ingestError instanceof Error ? ingestError.message : "Unable to ingest repositories.");
    } finally {
      setIsIngesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">ContribRadar Ops</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white">Private beta readiness</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Inspect production alert delivery cron runs and manually ingest GitHub repository data.
            </p>
          </div>
          <Badge variant="outline" className="gap-2 px-3 py-1">
            <ShieldCheck className="h-4 w-4" />
            OPS protected
          </Badge>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Ops access</CardTitle>
            <CardDescription>Enter the current `OPS_API_KEY` value from Vercel to load protected ops data.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={loadRuns}>
              <input
                className="min-h-10 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-emerald-500"
                onChange={(event) => setOpsKey(event.target.value)}
                placeholder="OPS_API_KEY"
                type="password"
                value={opsKey}
              />
              <Button disabled={isLoading || opsKey.trim().length === 0} type="submit">
                <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Load runs
              </Button>
            </form>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              GitHub ingestion
            </CardTitle>
            <CardDescription>
              Enter up to 10 `owner/repo` values separated by commas or new lines. This upserts repository metadata and open issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={ingestRepositories}>
              <textarea
                className="min-h-28 w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500"
                onChange={(event) => setRepositoryInput(event.target.value)}
                placeholder="vercel/next.js&#10;prisma/prisma"
                value={repositoryInput}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">{repositoriesToIngest.length}/10 repositories queued</p>
                <Button
                  disabled={isIngesting || opsKey.trim().length === 0 || repositoriesToIngest.length === 0 || repositoriesToIngest.length > 10}
                  type="submit"
                >
                  <UploadCloud className={isIngesting ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
                  Ingest repositories
                </Button>
              </div>
            </form>

            {ingestionError ? <p className="text-sm text-red-300">{ingestionError}</p> : null}
            {ingestionResult ? (
              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm font-medium text-white">{formatIngestionSummary(ingestionResult)}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {ingestionResult.repositories.map((result) => (
                    <div key={result.repository} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">{result.repository}</span>
                        <Badge variant={result.status === "failed" ? "destructive" : "default"}>
                          {getIngestionStatusLabel(result.status)}
                        </Badge>
                      </div>
                      {result.status === "succeeded" ? (
                        <p className="mt-2 text-xs text-zinc-400">
                          {result.issuesUpserted ?? 0} issues upserted, score {result.readinessScore ?? "unknown"}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-red-300">{result.error?.message ?? "Ingestion failed."}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-5">
          <MetricCard label="Runs" value={summary.totalRuns} />
          <MetricCard label="Succeeded" value={summary.succeeded} />
          <MetricCard label="Failed" value={summary.failed} />
          <MetricCard label="Attempts" value={summary.deliveryAttempts} />
          <MetricCard label="Delivery failures" value={summary.deliveryFailures} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent cron runs</CardTitle>
            <CardDescription>The API returns the 10 newest delivery and ingestion cron runs. Delivery runs include up to 50 recent attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
                Load runs to inspect production cron history. An empty result after loading means no cron run has been recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="py-3 pr-4 font-medium">Run</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 pr-4 font-medium">Started</th>
                      <th className="py-3 pr-4 font-medium">Duration</th>
                      <th className="py-3 pr-4 font-medium">Users</th>
                      <th className="py-3 pr-4 font-medium">Alerts</th>
                      <th className="py-3 pr-4 font-medium">Failures</th>
                      <th className="py-3 font-medium">Attempts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {runs.map((run) => (
                      <tr key={run.id} className="align-top">
                        <td className="py-4 pr-4">
                          <p className="font-medium text-white">{run.name}</p>
                          <p className="mt-1 max-w-44 truncate text-xs text-zinc-500">{run.id}</p>
                          {run.errorSummary ? <p className="mt-2 max-w-56 text-xs text-red-300">{run.errorSummary}</p> : null}
                        </td>
                        <td className="py-4 pr-4">
                          <Badge variant={getRunStatusVariant(run.status)}>{getRunStatusLabel(run.status)}</Badge>
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">{formatDateTime(run.startedAt)}</td>
                        <td className="py-4 pr-4 text-zinc-300">{formatDuration(run.durationMs)}</td>
                        <td className="py-4 pr-4 text-zinc-300">{run.usersChecked}</td>
                        <td className="py-4 pr-4 text-zinc-300">{run.alertsCreated}</td>
                        <td className="py-4 pr-4 text-zinc-300">{run.failures}</td>
                        <td className="py-4">
                          <DeliveryAttempts attempts={run.attempts ?? []} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function DeliveryAttempts({ attempts }: { attempts: CronRunView["attempts"] }) {
  if (!attempts || attempts.length === 0) {
    return <span className="text-xs text-zinc-500">No attempts</span>;
  }

  return (
    <div className="space-y-2">
      {attempts.slice(0, 3).map((attempt, index) => (
        <div key={`${attempt.alertId ?? "attempt"}-${index}`} className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={attempt.status === "failed" ? "destructive" : "secondary"}>{attempt.status}</Badge>
            <span className="text-xs text-zinc-300">{attempt.channel}</span>
            <span className="text-xs text-zinc-500">{attempt.attempts} tries</span>
          </div>
          {attempt.error || attempt.reason ? <p className="mt-2 text-xs text-zinc-400">{attempt.error ?? attempt.reason}</p> : null}
        </div>
      ))}
      {attempts.length > 3 ? <p className="text-xs text-zinc-500">+{attempts.length - 3} more attempts</p> : null}
    </div>
  );
}
