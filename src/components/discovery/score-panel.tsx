import type { RepoWithScore } from "@/domain/types";

type ScorePanelProps = {
  repo?: RepoWithScore;
};

export function ScorePanel({ repo }: ScorePanelProps) {
  if (repo === undefined) {
    return (
      <section className="rounded border border-zinc-900 bg-zinc-950 p-5">
        <h2 className="text-sm font-semibold text-white">Score detail</h2>
        <p className="mt-3 text-sm text-zinc-500">Select a repository to inspect readiness evidence.</p>
      </section>
    );
  }

  return (
    <section className="rounded border border-zinc-900 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Selected repository</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{repo.fullName}</h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-emerald-300">{repo.readiness.score}</p>
          <p className="text-xs text-zinc-500">{repo.readiness.confidence}% confidence</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {repo.readiness.breakdown.map((component) => (
          <div key={component.key}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-zinc-300">{component.label}</span>
              <span className="text-zinc-500">
                {component.score} / weight {component.weight}
              </span>
            </div>
            <div className="mt-2 h-2 rounded bg-zinc-900">
              <div
                className="h-2 rounded bg-emerald-400"
                style={{ width: `${Math.max(0, Math.min(100, component.score))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{component.raw}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-zinc-900 pt-4">
        <h3 className="text-sm font-semibold text-white">Explanation</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{repo.readiness.explanation}</p>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-white">Raw evidence</h3>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-zinc-500">Open issues</dt>
            <dd className="text-zinc-300">{repo.openIssues}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Active contributors</dt>
            <dd className="text-zinc-300">{repo.metrics.activeContributors30d}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">CI pass rate</dt>
            <dd className="text-zinc-300">
              {repo.metrics.ciPassRate === null ? "Unknown" : `${Math.round(repo.metrics.ciPassRate * 100)}%`}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Critical bugs</dt>
            <dd className="text-zinc-300">{repo.metrics.openCriticalBugs}</dd>
          </div>
        </dl>
      </div>

      {repo.readiness.warnings.length > 0 ? (
        <div className="mt-5 border-t border-zinc-900 pt-4">
          <h3 className="text-sm font-semibold text-white">Warnings</h3>
          <ul className="mt-2 space-y-2">
            {repo.readiness.warnings.map((warning) => (
              <li className="text-sm text-amber-300" key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
