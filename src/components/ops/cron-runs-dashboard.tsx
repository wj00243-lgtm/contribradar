"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";
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

type OpsResponse = {
  runs: CronRunView[];
};

export function CronRunsDashboard() {
  const [opsKey, setOpsKey] = useState("");
  const [runs, setRuns] = useState<CronRunView[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const summary = useMemo(() => summarizeCronRuns(runs), [runs]);

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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-300">ContribRadar Ops</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-white">Private beta readiness</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Inspect production alert delivery cron runs before inviting private beta users.
            </p>
          </div>
          <Badge variant="outline" className="gap-2 px-3 py-1">
            <ShieldCheck className="h-4 w-4" />
            Read-only
          </Badge>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Ops access</CardTitle>
            <CardDescription>Enter the current `OPS_API_KEY` value from Vercel to load protected cron history.</CardDescription>
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

        <div className="grid gap-3 md:grid-cols-5">
          <MetricCard label="Runs" value={summary.totalRuns} />
          <MetricCard label="Succeeded" value={summary.succeeded} />
          <MetricCard label="Failed" value={summary.failed} />
          <MetricCard label="Attempts" value={summary.deliveryAttempts} />
          <MetricCard label="Delivery failures" value={summary.deliveryFailures} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent delivery cron runs</CardTitle>
            <CardDescription>The API returns the 10 newest runs and up to 50 recent delivery attempts per run.</CardDescription>
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
