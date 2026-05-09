import type { RepoWithScore, SortMode } from "@/domain/types";

export type DiscoveryFilters = {
  language: string;
  minScore: number;
  sort: SortMode;
  goodFirstOnly: boolean;
  license: string;
  lastCommitWithinDays: number | "";
  minContributors: number | "";
  maxContributors: number | "";
};

const FILTER_REFERENCE_DATE = new Date("2026-05-06T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function responseTimeValue(repo: RepoWithScore): number {
  return repo.metrics.maintainerResponseHours ?? Number.POSITIVE_INFINITY;
}

function daysSinceLastCommit(repo: RepoWithScore): number {
  return (FILTER_REFERENCE_DATE.getTime() - new Date(repo.lastCommitAt).getTime()) / MS_PER_DAY;
}

export function filterAndSortRepos(repos: RepoWithScore[], filters: DiscoveryFilters): RepoWithScore[] {
  const filtered = repos.filter((repo) => {
    const languageMatches = filters.language === "" || repo.language === filters.language;
    const scoreMatches = repo.readiness.score >= filters.minScore;
    const goodFirstMatches = !filters.goodFirstOnly || repo.hasGoodFirstIssue;
    const licenseMatches = filters.license === "" || repo.license === filters.license;
    const lastCommitMatches =
      filters.lastCommitWithinDays === "" || daysSinceLastCommit(repo) <= filters.lastCommitWithinDays;
    const minContributorsMatches =
      filters.minContributors === "" || repo.contributorCount >= filters.minContributors;
    const maxContributorsMatches =
      filters.maxContributors === "" || repo.contributorCount <= filters.maxContributors;

    return (
      languageMatches &&
      scoreMatches &&
      goodFirstMatches &&
      licenseMatches &&
      lastCommitMatches &&
      minContributorsMatches &&
      maxContributorsMatches
    );
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === "stars") {
      return right.stars - left.stars;
    }

    if (filters.sort === "activity") {
      return right.metrics.commitsPerDay - left.metrics.commitsPerDay;
    }

    if (filters.sort === "response_time") {
      return responseTimeValue(left) - responseTimeValue(right);
    }

    return right.readiness.score - left.readiness.score;
  });
}
