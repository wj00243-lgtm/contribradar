import { seedIssues, seedRepositories } from "@/data/seed";
import { scoreIssueReadiness, scoreRepositoryReadiness } from "@/domain/scoring";
import type {
  DiscoverIssuesQuery,
  DiscoverReposQuery,
  Issue,
  IssueWithScore,
  Repository,
  RepoWithScore,
  ScoreComponent,
  SortMode
} from "@/domain/types";

const FIXED_NOW = new Date("2026-05-06T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type RepositoryFacets = {
  languages: string[];
  topics: string[];
};

type RepositoryScoreResponse =
  | {
      status: 200;
      data: {
        repository: RepoWithScore;
        readiness_score: number;
        confidence: number;
        breakdown: ScoreComponent[];
        explanation: string;
        warnings: string[];
      };
      error?: never;
    }
  | {
      status: 404;
      data?: never;
      error: {
        code: "REPOSITORY_NOT_FOUND";
        message: string;
      };
    };

function normalizePage(page?: number): number {
  return Math.max(1, Math.floor(page ?? 1));
}

function normalizeLimit(limit?: number): number {
  return Math.min(100, Math.max(1, Math.floor(limit ?? 20)));
}

function paginate<T>(items: T[], page?: number, limit?: number): T[] {
  const safePage = normalizePage(page);
  const safeLimit = normalizeLimit(limit);
  const start = (safePage - 1) * safeLimit;

  return items.slice(start, start + safeLimit);
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function includesAll(haystack: string[], needles: string[]): boolean {
  const normalizedHaystack = new Set(haystack.map(normalizeText));

  return needles.every((needle) => normalizedHaystack.has(normalizeText(needle)));
}

function daysSince(dateValue: string): number {
  return (FIXED_NOW.getTime() - new Date(dateValue).getTime()) / MS_PER_DAY;
}

function compareNullableNumberAsc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

function repositoryHasGoodFirstIssue(repoId: string): boolean {
  return seedIssues.some(
    (issue) =>
      issue.repoId === repoId &&
      issue.state === "open" &&
      issue.labels.some((label) => normalizeText(label) === "good first issue")
  );
}

function repositoryFacets(repos: RepoWithScore[]): RepositoryFacets {
  return {
    languages: [...new Set(repos.map((repo) => repo.language))].sort(),
    topics: [...new Set(repos.flatMap((repo) => repo.topics))].sort()
  };
}

function sortRepositories(repos: RepoWithScore[], sort: SortMode): RepoWithScore[] {
  return [...repos].sort((left, right) => {
    switch (sort) {
      case "stars":
        return right.stars - left.stars;
      case "activity":
        return new Date(right.lastCommitAt).getTime() - new Date(left.lastCommitAt).getTime();
      case "response_time":
        return compareNullableNumberAsc(
          left.metrics.maintainerResponseHours,
          right.metrics.maintainerResponseHours
        );
      case "score":
        return right.readiness.score - left.readiness.score;
    }
  });
}

export function toRepoWithScore(repo: Repository): RepoWithScore {
  return {
    ...repo,
    readiness: scoreRepositoryReadiness(repo),
    hasGoodFirstIssue: repositoryHasGoodFirstIssue(repo.id)
  };
}

export function discoverRepositories(query: Partial<DiscoverReposQuery> = {}): {
  repos: RepoWithScore[];
  total: number;
  facets: RepositoryFacets;
} {
  const sort = query.sort ?? "score";
  const allRepos = seedRepositories.map(toRepoWithScore);
  const filteredRepos = allRepos.filter((repo) => {
    if (
      query.language !== undefined &&
      normalizeText(repo.language) !== normalizeText(query.language)
    ) {
      return false;
    }

    if (query.topics !== undefined && !includesAll(repo.topics, query.topics)) {
      return false;
    }

    if (query.minScore !== undefined && repo.readiness.score < query.minScore) {
      return false;
    }

    if (
      query.hasGoodFirstIssue !== undefined &&
      repo.hasGoodFirstIssue !== query.hasGoodFirstIssue
    ) {
      return false;
    }

    if (
      query.lastActiveWithinDays !== undefined &&
      daysSince(repo.lastCommitAt) > query.lastActiveWithinDays
    ) {
      return false;
    }

    return true;
  });

  const sortedRepos = sortRepositories(filteredRepos, sort);

  return {
    repos: paginate(sortedRepos, query.page, query.limit),
    total: filteredRepos.length,
    facets: repositoryFacets(allRepos)
  };
}

export function getRepositoryScore(owner: string, repoName: string): RepositoryScoreResponse {
  const repo = seedRepositories.find(
    (candidate) =>
      normalizeText(candidate.owner) === normalizeText(owner) &&
      normalizeText(candidate.name) === normalizeText(repoName)
  );

  if (repo === undefined) {
    return {
      status: 404,
      error: {
        code: "REPOSITORY_NOT_FOUND",
        message: `Repository ${owner}/${repoName} was not found.`
      }
    };
  }

  const repoWithScore = toRepoWithScore(repo);

  return {
    status: 200,
    data: {
      repository: repoWithScore,
      readiness_score: repoWithScore.readiness.score,
      confidence: repoWithScore.readiness.confidence,
      breakdown: repoWithScore.readiness.breakdown,
      explanation: repoWithScore.readiness.explanation,
      warnings: repoWithScore.readiness.warnings
    }
  };
}

export function discoverIssues(query: Partial<DiscoverIssuesQuery> = {}): {
  issues: IssueWithScore[];
  total: number;
} {
  const issues = seedIssues.map((issue: Issue): IssueWithScore => {
    return {
      ...issue,
      readiness: scoreIssueReadiness(issue)
    };
  });
  const filteredIssues = issues.filter((issue) => {
    if (query.repoId !== undefined && issue.repoId !== query.repoId) {
      return false;
    }

    if (query.labels !== undefined && !includesAll(issue.labels, query.labels)) {
      return false;
    }

    if (query.minIssueScore !== undefined && issue.readiness.score < query.minIssueScore) {
      return false;
    }

    if (query.isStale !== undefined && issue.isStale !== query.isStale) {
      return false;
    }

    if (query.hasNoAssignee !== undefined) {
      const hasNoAssignee = issue.assignees.length === 0;

      if (hasNoAssignee !== query.hasNoAssignee) {
        return false;
      }
    }

    if (query.difficulty !== undefined && issue.difficulty !== query.difficulty) {
      return false;
    }

    return true;
  });
  const sortedIssues = [...filteredIssues].sort(
    (left, right) => right.readiness.score - left.readiness.score
  );

  return {
    issues: paginate(sortedIssues, query.page, query.limit),
    total: filteredIssues.length
  };
}
