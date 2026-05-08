import type { IssueWithScore, RepoWithScore } from "@/domain/types";
import { FilterSummary } from "./filter-summary";
import { IssueList } from "./issue-list";
import { RepoList } from "./repo-list";
import { ScorePanel } from "./score-panel";

type DiscoveryDashboardProps = {
  repos: RepoWithScore[];
  total: number;
  facets: {
    languages: string[];
    topics: string[];
  };
  issues: IssueWithScore[];
};

export function DiscoveryDashboard({ repos, total, facets, issues }: DiscoveryDashboardProps) {
  const selectedRepo = repos[0];
  const averageScore =
    repos.length === 0
      ? 0
      : Math.round(repos.reduce((sum, repo) => sum + repo.readiness.score, 0) / repos.length);
  const goodFirstIssueCount = repos.filter((repo) => repo.hasGoodFirstIssue).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900 px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-emerald-300">ContribRadar</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-white">Discovery dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Ranked repositories and unassigned issues scored for contributor readiness.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="min-w-28 rounded border border-zinc-900 bg-zinc-950 px-3 py-2">
                <p className="text-xs text-zinc-500">Avg score</p>
                <p className="text-lg font-semibold text-white">{averageScore}</p>
              </div>
              <div className="min-w-28 rounded border border-zinc-900 bg-zinc-950 px-3 py-2">
                <p className="text-xs text-zinc-500">GFI repos</p>
                <p className="text-lg font-semibold text-white">{goodFirstIssueCount}</p>
              </div>
              <div className="min-w-28 rounded border border-zinc-900 bg-zinc-950 px-3 py-2">
                <p className="text-xs text-zinc-500">Issues</p>
                <p className="text-lg font-semibold text-white">{issues.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <FilterSummary total={total} languages={facets.languages} topics={facets.topics} />

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <RepoList repos={repos} selectedRepoId={selectedRepo?.id} />
          <IssueList issues={issues} />
        </div>
        <ScorePanel repo={selectedRepo} />
      </div>
    </main>
  );
}
