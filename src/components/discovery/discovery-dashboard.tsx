"use client";

import { useEffect, useMemo, useState } from "react";
import type { IssueWithScore, RepoWithScore } from "@/domain/types";
import { filterAndSortRepos, type DiscoveryFilters } from "./discovery-filtering";
import { FilterSummary } from "./filter-summary";
import { IssueList } from "./issue-list";
import { RepoList } from "./repo-list";
import { ScorePanel } from "./score-panel";
import { WatchlistPanel } from "./watchlist-panel";

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
  const [filters, setFilters] = useState<DiscoveryFilters>({
    language: "",
    minScore: 50,
    sort: "score",
    goodFirstOnly: false
  });
  const [selectedRepoId, setSelectedRepoId] = useState(repos[0]?.id);
  const visibleRepos = useMemo(() => filterAndSortRepos(repos, filters), [filters, repos]);
  const selectedRepo = visibleRepos.find((repo) => repo.id === selectedRepoId) ?? visibleRepos[0];
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
            onFiltersChange={setFilters}
            resultCount={visibleRepos.length}
            totalLoaded={repos.length}
          />
          <RepoList repos={visibleRepos} selectedRepoId={selectedRepo?.id} onSelectRepo={setSelectedRepoId} />
          <IssueList issues={issues} />
        </div>
        <div className="space-y-6">
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
  onFiltersChange: (filters: DiscoveryFilters) => void;
  resultCount: number;
  totalLoaded: number;
};

function DiscoveryControls({
  facets,
  filters,
  onFiltersChange,
  resultCount,
  totalLoaded
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
          onClick={() => updateFilters({ language: "", minScore: 50, sort: "score", goodFirstOnly: false })}
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
    </section>
  );
}
