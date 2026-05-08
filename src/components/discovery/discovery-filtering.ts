import type { RepoWithScore, SortMode } from "@/domain/types";

export type DiscoveryFilters = {
  language: string;
  minScore: number;
  sort: SortMode;
  goodFirstOnly: boolean;
};

function responseTimeValue(repo: RepoWithScore): number {
  return repo.metrics.maintainerResponseHours ?? Number.POSITIVE_INFINITY;
}

export function filterAndSortRepos(repos: RepoWithScore[], filters: DiscoveryFilters): RepoWithScore[] {
  const filtered = repos.filter((repo) => {
    const languageMatches = filters.language === "" || repo.language === filters.language;
    const scoreMatches = repo.readiness.score >= filters.minScore;
    const goodFirstMatches = !filters.goodFirstOnly || repo.hasGoodFirstIssue;

    return languageMatches && scoreMatches && goodFirstMatches;
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
