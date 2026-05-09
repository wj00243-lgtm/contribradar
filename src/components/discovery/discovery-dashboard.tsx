"use client";

import { useEffect, useMemo, useState } from "react";
import type { IssueWithScore, RepoWithScore } from "@/domain/types";
import { NotificationCenter } from "@/components/alerts/notification-center";
import { ProGate } from "@/components/pro/pro-gate";
import { filterAndSortRepos, type DiscoveryFilters } from "./discovery-filtering";
import { FilterSummary } from "./filter-summary";
import { IssueList } from "./issue-list";
import { RepoList } from "./repo-list";
import { ScorePanel } from "./score-panel";
import { WatchlistPanel } from "./watchlist-panel";
import { AiRecommendationsPanel } from "@/components/recommendations/ai-recommendations-panel";
import { RepoComparison } from "./repo-comparison";

type DiscoveryDashboardProps = {
  repos: RepoWithScore[];
  total: number;
  facets: {
    languages: string[];
    topics: string[];
  };
  issues: IssueWithScore[];
  userPlan?: string | null;
};

export function DiscoveryDashboard({ repos, total, facets, issues, userPlan }: DiscoveryDashboardProps) {
  const [filters, setFilters] = useState<DiscoveryFilters>({
    language: "",
    minScore: 50,
    sort: "score",
    goodFirstOnly: false,
    license: "",
    lastCommitWithinDays: "",
    minContributors: "",
    maxContributors: ""
  });
  const [selectedRepoId, setSelectedRepoId] = useState(repos[0]?.id);
  const [comparisonRepoIds, setComparisonRepoIds] = useState<string[]>([]);
  const visibleRepos = useMemo(() => filterAndSortRepos(repos, filters), [filters, repos]);
  const selectedRepo = visibleRepos.find((repo) => repo.id === selectedRepoId) ?? visibleRepos[0];
  const comparisonRepos = comparisonRepoIds
    .map((repoId) => repos.find((repo) => repo.id === repoId))
    .filter((repo): repo is RepoWithScore => repo !== undefined);
  const licenses = useMemo(() => [...new Set(repos.map((repo) => repo.license))].sort(), [repos]);
  const averageScore =
    visibleRepos.length === 0
      ? 0
      : Math.round(visibleRepos.reduce((sum, repo) => sum + repo.readiness.score, 0) / visibleRepos.length);
  const goodFirstIssueCount = visibleRepos.filter((repo) => repo.hasGoodFirstIssue).length;

  useEffect(() => {
    if (selectedRepo?.id !== selectedRepoId) {
      setSelectedRepoId(selectedRepo?.id);
    }
  }, [selectedRepo?.id, selectedRepoId]);

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
          <DiscoveryControls
            facets={facets}
            filters={filters}
            licenses={licenses}
            onFiltersChange={setFilters}
            resultCount={visibleRepos.length}
            totalLoaded={repos.length}
            userPlan={userPlan}
          />
          <ComparisonPicker
            comparisonRepoIds={comparisonRepoIds}
            onComparisonRepoIdsChange={setComparisonRepoIds}
            repos={visibleRepos}
            userPlan={userPlan}
          />
          <RepoList repos={visibleRepos} selectedRepoId={selectedRepo?.id} onSelectRepo={setSelectedRepoId} />
          <IssueList issues={issues} />
        </div>
        <div className="space-y-6">
          <ProGate featureName="repoComparison" userPlan={userPlan}>
            <RepoComparison repos={comparisonRepos} />
          </ProGate>
          <NotificationCenter userPlan={userPlan} />
          <AiRecommendationsPanel userPlan={userPlan} />
          {selectedRepo === undefined ? null : <ScorePanel repo={selectedRepo} />}
          <WatchlistPanel
            filters={{
              languages: filters.language === "" ? [] : [filters.language],
              topics: [],
              minScore: filters.minScore,
              hasGoodFirstIssue: filters.goodFirstOnly
            }}
            initialRepoCount={visibleRepos.length}
          />
        </div>
      </div>
    </main>
  );
}

type DiscoveryControlsProps = {
  facets: DiscoveryDashboardProps["facets"];
  filters: DiscoveryFilters;
  licenses: string[];
  onFiltersChange: (filters: DiscoveryFilters) => void;
  resultCount: number;
  totalLoaded: number;
  userPlan?: string | null;
};

function DiscoveryControls({
  facets,
  filters,
  licenses,
  onFiltersChange,
  resultCount,
  totalLoaded,
  userPlan
}: DiscoveryControlsProps) {
  function updateFilters(nextFilters: Partial<DiscoveryFilters>) {
    onFiltersChange({ ...filters, ...nextFilters });
  }

  return (
    <section className="rounded border border-zinc-900 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Discovery filters</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Filtering {resultCount} of {totalLoaded} loaded repositories.
          </p>
        </div>
        <button
          className="rounded border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          onClick={() =>
            updateFilters({
              language: "",
              minScore: 50,
              sort: "score",
              goodFirstOnly: false,
              license: "",
              lastCommitWithinDays: "",
              minContributors: "",
              maxContributors: ""
            })
          }
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="block text-xs font-medium text-zinc-400">
          Language
          <select
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
            onChange={(event) => updateFilters({ language: event.target.value })}
            value={filters.language}
          >
            <option value="">All languages</option>
            {facets.languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-zinc-400">
          Minimum score
          <input
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
            max={100}
            min={0}
            onChange={(event) => updateFilters({ minScore: Number(event.target.value) })}
            type="number"
            value={filters.minScore}
          />
        </label>

        <label className="block text-xs font-medium text-zinc-400">
          Sort
          <select
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
            onChange={(event) => updateFilters({ sort: event.target.value as DiscoveryFilters["sort"] })}
            value={filters.sort}
          >
            <option value="score">Score</option>
            <option value="stars">Stars</option>
            <option value="activity">Activity</option>
            <option value="response_time">Response time</option>
          </select>
        </label>

        <label className="flex min-h-16 items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            checked={filters.goodFirstOnly}
            className="h-4 w-4 accent-emerald-400"
            onChange={(event) => updateFilters({ goodFirstOnly: event.target.checked })}
            type="checkbox"
          />
          Good first issue only
        </label>
      </div>

      <ProGate featureName="repoComparison" userPlan={userPlan}>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block text-xs font-medium text-zinc-400">
            License
            <select
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
              onChange={(event) => updateFilters({ license: event.target.value })}
              value={filters.license}
            >
              <option value="">All licenses</option>
              {licenses.map((license) => (
                <option key={license} value={license}>
                  {license}
                </option>
              ))}
            </select>
          </label>

          <NumberFilter
            label="Last commit within"
            onChange={(value) => updateFilters({ lastCommitWithinDays: value })}
            suffix="days"
            value={filters.lastCommitWithinDays}
          />
          <NumberFilter
            label="Min contributors"
            onChange={(value) => updateFilters({ minContributors: value })}
            value={filters.minContributors}
          />
          <NumberFilter
            label="Max contributors"
            onChange={(value) => updateFilters({ maxContributors: value })}
            value={filters.maxContributors}
          />
        </div>
      </ProGate>
    </section>
  );
}

function NumberFilter({
  label,
  onChange,
  suffix,
  value
}: {
  label: string;
  onChange: (value: number | "") => void;
  suffix?: string;
  value: number | "";
}) {
  return (
    <label className="block text-xs font-medium text-zinc-400">
      {label}
      <div className="mt-2 flex rounded border border-zinc-800 bg-zinc-900 focus-within:border-emerald-500">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
          min={0}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          type="number"
          value={value}
        />
        {suffix ? <span className="px-3 py-2 text-sm text-zinc-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function ComparisonPicker({
  comparisonRepoIds,
  onComparisonRepoIdsChange,
  repos,
  userPlan
}: {
  comparisonRepoIds: string[];
  onComparisonRepoIdsChange: (repoIds: string[]) => void;
  repos: RepoWithScore[];
  userPlan?: string | null;
}) {
  function toggleRepo(repoId: string) {
    if (comparisonRepoIds.includes(repoId)) {
      onComparisonRepoIdsChange(comparisonRepoIds.filter((id) => id !== repoId));
      return;
    }

    onComparisonRepoIdsChange([...comparisonRepoIds, repoId].slice(-3));
  }

  return (
    <ProGate featureName="repoComparison" userPlan={userPlan}>
      <section className="rounded border border-zinc-900 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Compare repositories</h2>
            <p className="mt-1 text-xs text-zinc-500">Select 2-3 repositories from the current results.</p>
          </div>
          <button
            className="rounded border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            onClick={() => onComparisonRepoIdsChange([])}
            type="button"
          >
            Clear
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {repos.slice(0, 8).map((repo) => (
            <label key={repo.id} className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
              <input
                checked={comparisonRepoIds.includes(repo.id)}
                className="h-4 w-4 accent-emerald-400"
                onChange={() => toggleRepo(repo.id)}
                type="checkbox"
              />
              <span className="min-w-0 truncate">{repo.fullName}</span>
            </label>
          ))}
        </div>
      </section>
    </ProGate>
  );
}
