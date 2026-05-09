import type { RepoWithScore } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RepoComparisonProps = {
  repos: RepoWithScore[];
};

export function RepoComparison({ repos }: RepoComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Repository comparison</CardTitle>
        <CardDescription>Compare 2-3 repositories side by side before committing to a contribution path.</CardDescription>
      </CardHeader>
      <CardContent>
        {repos.length < 2 ? (
          <p className="text-sm text-zinc-500">Select at least two repositories to compare.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {repos.map((repo) => (
              <article key={repo.id} className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{repo.fullName}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{repo.language}</p>
                  </div>
                  <Badge>{repo.readiness.score}</Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <Metric label="License" value={repo.license} />
                  <Metric label="Contributors" value={repo.contributorCount.toLocaleString()} />
                  <Metric label="Stars" value={repo.stars.toLocaleString()} />
                  <Metric label="Open issues" value={repo.openIssues.toLocaleString()} />
                  <Metric label="Response" value={repo.metrics.maintainerResponseHours === null ? "Unknown" : `${repo.metrics.maintainerResponseHours}h`} />
                  <Metric label="CI pass" value={repo.metrics.ciPassRate === null ? "Unknown" : `${Math.round(repo.metrics.ciPassRate * 100)}%`} />
                </dl>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-100">{value}</dd>
    </div>
  );
}
