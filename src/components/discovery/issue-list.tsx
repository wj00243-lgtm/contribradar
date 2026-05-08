import type { IssueWithScore } from "@/domain/types";

type IssueListProps = {
  issues: IssueWithScore[];
};

export function IssueList({ issues }: IssueListProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Starter issues</h2>
        <span className="text-xs text-zinc-500">{issues.length} shown</span>
      </div>
      <div className="space-y-3">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <article className="rounded border border-zinc-900 bg-zinc-950 p-4" key={issue.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500">#{issue.number}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-5 text-white">{issue.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-emerald-300">{issue.readiness.score}</p>
                  <p className="text-xs text-zinc-500">ready</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {issue.labels.map((label) => (
                  <span className="rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-400" key={label}>
                    {label}
                  </span>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded border border-zinc-900 bg-zinc-950 p-5 text-sm text-zinc-500">
            No unassigned starter issues match the current filters.
          </div>
        )}
      </div>
    </section>
  );
}
