import type { RepoWithScore } from "@/domain/types";

type RepoListProps = {
  repos: RepoWithScore[];
  onSelectRepo: (repoId: string) => void;
  selectedRepoId?: string;
};

function formatResponseTime(hours: number | null): string {
  if (hours === null) {
    return "Unknown";
  }

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

export function RepoList({ repos, onSelectRepo, selectedRepoId }: RepoListProps) {
  if (repos.length === 0) {
    return (
      <section className="rounded border border-zinc-900 bg-zinc-950 p-5">
        <h2 className="text-sm font-semibold text-white">Repositories</h2>
        <p className="mt-3 text-sm text-zinc-500">No repositories match the current discovery filters.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Repositories</h2>
        <span className="text-xs text-zinc-500">{repos.length} shown</span>
      </div>
      <div className="space-y-3">
        {repos.map((repo) => {
          const selected = repo.id === selectedRepoId;

          return (
            <button
              aria-pressed={selected}
              className={[
                "block w-full rounded border bg-zinc-950 p-4 text-left transition",
                selected
                  ? "border-emerald-500/60 ring-1 ring-emerald-500/40"
                  : "border-zinc-900 hover:border-zinc-700"
              ].join(" ")}
              key={repo.id}
              onClick={() => onSelectRepo(repo.id)}
              type="button"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{repo.fullName}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">{repo.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-emerald-300">{repo.readiness.score}</p>
                  <p className="text-xs text-zinc-500">±{repo.readiness.confidence}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
                <span className="rounded border border-zinc-800 px-2 py-1">{repo.language}</span>
                <span className="rounded border border-zinc-800 px-2 py-1">{repo.stars.toLocaleString()} stars</span>
                <span className="rounded border border-zinc-800 px-2 py-1">
                  Response {formatResponseTime(repo.metrics.maintainerResponseHours)}
                </span>
                {repo.hasGoodFirstIssue ? (
                  <span className="rounded border border-emerald-900/80 bg-emerald-950/40 px-2 py-1 text-emerald-300">
                    Good first issue
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
