import { scoreIssueReadiness, scoreRepositoryReadiness } from "@/domain/scoring";
import type { Issue, Repository } from "@/domain/types";
import {
  fetchGitHubRepoSnapshot,
  GitHubConfigurationError,
  type GitHubContentSignals,
  GitHubResponseError,
  type GitHubClientOptions,
  type GitHubIssuePayload,
  type GitHubRepositoryPayload
} from "./github";

const STALE_ISSUE_DAYS = 60;

export type GitHubIngestionDbClient = {
  repository: {
    upsert: (args: any) => Promise<{ id: string; fullName?: string }>;
  };
  issue: {
    upsert: (args: any) => Promise<unknown>;
  };
};

export type IngestGitHubRepositoryOptions = {
  token?: string;
  fetcher?: GitHubClientOptions["fetcher"];
  now?: Date;
  issueLimit?: number;
  timeoutMs?: number;
};

type RepositorySuccess = {
  repository: string;
  status: "succeeded";
  issuesUpserted: number;
  readinessScore: number;
};

type RepositoryFailure = {
  repository: string;
  status: "failed";
  error: {
    code: string;
    message: string;
  };
};

export type GitHubIngestionResult = {
  repositories: Array<RepositorySuccess | RepositoryFailure>;
  totals: {
    requested: number;
    succeeded: number;
    failed: number;
    issuesUpserted: number;
  };
};

export class GitHubIngestionError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "GitHubIngestionError";
  }
}

export async function ingestGitHubRepositories(
  client: GitHubIngestionDbClient,
  repositories: string[],
  options: IngestGitHubRepositoryOptions = {}
): Promise<GitHubIngestionResult> {
  const results: GitHubIngestionResult["repositories"] = [];

  for (const repository of repositories) {
    try {
      results.push(await ingestGitHubRepository(client, repository, options));
    } catch (error) {
      results.push({
        repository,
        status: "failed",
        error: formatIngestionError(error)
      });
    }
  }

  return {
    repositories: results,
    totals: {
      requested: repositories.length,
      succeeded: results.filter((result) => result.status === "succeeded").length,
      failed: results.filter((result) => result.status === "failed").length,
      issuesUpserted: results.reduce(
        (total, result) => total + (result.status === "succeeded" ? result.issuesUpserted : 0),
        0
      )
    }
  };
}

export async function ingestGitHubRepository(
  client: GitHubIngestionDbClient,
  repositoryRef: string,
  options: IngestGitHubRepositoryOptions = {}
): Promise<RepositorySuccess> {
  const parsedRef = parseRepositoryRef(repositoryRef);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const issueLimit = options.issueLimit ?? 20;
  const {
    repository,
    issues: issueRecords,
    contentSignals
  } = await fetchGitHubRepoSnapshot(`${parsedRef.owner}/${parsedRef.repo}`, {
    fetcher,
    token: options.token,
    issueLimit,
    timeoutMs: options.timeoutMs
  });
  const domainRepository = toDomainRepository(repository, issueRecords, contentSignals, now);
  const repoScore = scoreRepositoryReadiness(domainRepository);
  const repoRecord = await client.repository.upsert({
    where: { githubId: String(repository.id) },
    create: toRepositoryWrite(repository, contentSignals, repoScore.score, repoScore.confidence),
    update: toRepositoryWrite(repository, contentSignals, repoScore.score, repoScore.confidence)
  });

  for (const issue of issueRecords) {
    const domainIssue = toDomainIssue(issue, repoRecord.id, now);
    const issueScore = scoreIssueReadiness(domainIssue);

    await client.issue.upsert({
      where: { githubId: String(issue.id) },
      create: toIssueWrite(issue, repoRecord.id, issueScore.score, now),
      update: toIssueWrite(issue, repoRecord.id, issueScore.score, now)
    });
  }

  return {
    repository: repository.full_name,
    status: "succeeded",
    issuesUpserted: issueRecords.length,
    readinessScore: repoScore.score
  };
}

function parseRepositoryRef(repositoryRef: string): { owner: string; repo: string } {
  const [owner, repo, extra] = repositoryRef.split("/");

  if (!owner || !repo || extra || owner.trim() !== owner || repo.trim() !== repo) {
    throw new GitHubIngestionError("INVALID_REPOSITORY_REF", "Repository must use the owner/repo format.");
  }

  return { owner, repo };
}

function toRepositoryWrite(
  repository: GitHubRepositoryPayload,
  contentSignals: GitHubContentSignals,
  score: number,
  confidence: number
) {
  return {
    githubId: String(repository.id),
    fullName: repository.full_name,
    owner: repository.owner.login,
    name: repository.name,
    description: repository.description ?? "",
    language: repository.language ?? "unknown",
    topics: repository.topics ?? [],
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    license: repository.license?.spdx_id ?? repository.license?.key ?? "unknown",
    contributorCount: 0,
    sizeKb: repository.size,
    lastCommitAt: dateFrom(repository.pushed_at ?? repository.updated_at),
    createdAt: dateFrom(repository.created_at),
    updatedAt: dateFrom(repository.updated_at),
    readinessScore: score,
    scoreConfidence: confidence,
    scoreCalculatedAt: new Date(),
    metricMaintainerResponseHours: null,
    metricNewcomerFriendlyScore:
      (contentSignals.hasContributingGuide ? 25 : 0) +
      (contentSignals.hasIssueTemplates ? 25 : 0),
    metricCodeHealthScore: null,
    metricCommunityActivityScore: null,
    metricDocumentationScore:
      (contentSignals.readmeLength > 500 ? 30 : 0) +
      (contentSignals.hasChangelog ? 20 : 0) +
      (contentSignals.hasApiDocs ? 25 : 0) +
      (contentSignals.hasExamples ? 25 : 0)
  };
}

function toIssueWrite(issue: GitHubIssuePayload, repoId: string, score: number, now: Date) {
  const labels = labelNames(issue.labels);
  const assignees = issue.assignees.flatMap((assignee) => (assignee.login ? [assignee.login] : []));

  return {
    repoId,
    githubId: String(issue.id),
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state,
    labels,
    assignees,
    createdAt: dateFrom(issue.created_at),
    updatedAt: dateFrom(issue.updated_at),
    closedAt: issue.closed_at ? dateFrom(issue.closed_at) : null,
    issueReadinessScore: score,
    hasAcceptanceCriteria: acceptanceCriteriaCount(issue.body ?? "") > 0,
    commentCount: issue.comments,
    lastCommentAt: issue.comments > 0 ? dateFrom(issue.updated_at) : null,
    firstResponseHours: null,
    isStale: isOlderThan(issue.updated_at, STALE_ISSUE_DAYS, now)
  };
}

function toDomainRepository(
  repository: GitHubRepositoryPayload,
  issues: GitHubIssuePayload[],
  contentSignals: GitHubContentSignals,
  now: Date
): Repository {
  const labels = issues.flatMap((issue) => labelNames(issue.labels)).map((label) => label.toLowerCase());
  const hasGoodFirstIssueLabel = labels.includes("good first issue");
  const activeDays = Math.max(1, daysBetween(repository.pushed_at ?? repository.updated_at, now));

  return {
    id: String(repository.id),
    githubId: String(repository.id),
    fullName: repository.full_name,
    owner: repository.owner.login,
    name: repository.name,
    description: repository.description ?? "",
    language: repository.language ?? "unknown",
    topics: repository.topics ?? [],
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    license: repository.license?.spdx_id ?? repository.license?.key ?? "unknown",
    contributorCount: 0,
    sizeKb: repository.size,
    lastCommitAt: repository.pushed_at ?? repository.updated_at,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at,
    metrics: {
      maintainerResponseHours: null,
      hasContributingGuide: contentSignals.hasContributingGuide,
      hasIssueTemplates: contentSignals.hasIssueTemplates,
      hasGoodFirstIssueLabel,
      averagePrMergeDays: null,
      ciPassRate: null,
      testCoveragePercent: null,
      openCriticalBugs: labels.filter((label) => label.includes("critical") || label.includes("security")).length,
      hasCodeOfConduct: contentSignals.hasCodeOfConduct,
      commitsPerDay: activeDays <= 30 ? 1 / activeDays : 0,
      activeContributors30d: 0,
      readmeLength: contentSignals.readmeLength,
      hasChangelog: contentSignals.hasChangelog,
      hasApiDocs: contentSignals.hasApiDocs,
      hasExamples: contentSignals.hasExamples
    }
  };
}

function toDomainIssue(issue: GitHubIssuePayload, repoId: string, now: Date): Issue {
  const body = issue.body ?? "";
  const assignees = issue.assignees.flatMap((assignee) => (assignee.login ? [assignee.login] : []));

  return {
    id: String(issue.id),
    repoId,
    githubId: String(issue.id),
    number: issue.number,
    title: issue.title,
    body,
    state: issue.state,
    labels: labelNames(issue.labels),
    assignees,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    lastCommentAt: issue.comments > 0 ? issue.updated_at : null,
    firstResponseHours: null,
    isStale: isOlderThan(issue.updated_at, STALE_ISSUE_DAYS, now),
    difficulty: "medium",
    metrics: {
      bodyWordCount: wordCount(body),
      acceptanceCriteriaCount: acceptanceCriteriaCount(body),
      commentCount: issue.comments,
      maintainerCommentCount: 0,
      ageHours: hoursBetween(issue.created_at, now),
      assigneeCount: assignees.length
    }
  };
}

function labelNames(labels: GitHubIssuePayload["labels"]): string[] {
  return labels.flatMap((label) => {
    if (typeof label === "string") {
      return [label];
    }

    return label.name ? [label.name] : [];
  });
}

function acceptanceCriteriaCount(body: string): number {
  const checklistItems = body.match(/^\s*[-*]\s+\[[ xX]\]/gm)?.length ?? 0;
  const acceptanceHeading = /acceptance criteria|acceptance/i.test(body) ? 1 : 0;

  return checklistItems + acceptanceHeading;
}

function wordCount(body: string): number {
  return body.trim().length === 0 ? 0 : body.trim().split(/\s+/).length;
}

function hoursBetween(date: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - dateFrom(date).getTime()) / (60 * 60 * 1000)));
}

function daysBetween(date: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - dateFrom(date).getTime()) / (24 * 60 * 60 * 1000)));
}

function isOlderThan(date: string, days: number, now: Date): boolean {
  return now.getTime() - dateFrom(date).getTime() > days * 24 * 60 * 60 * 1000;
}

function dateFrom(value: string): Date {
  return new Date(value);
}

function formatIngestionError(error: unknown): { code: string; message: string } {
  if (error instanceof GitHubIngestionError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof GitHubConfigurationError) {
    return {
      code: "INVALID_REPOSITORY_REF",
      message: error.message
    };
  }

  if (error instanceof GitHubResponseError) {
    return {
      code: "GITHUB_FETCH_FAILED",
      message: error.message
    };
  }

  return {
    code: "GITHUB_INGESTION_FAILED",
    message: error instanceof Error ? error.message : "GitHub ingestion failed."
  };
}
