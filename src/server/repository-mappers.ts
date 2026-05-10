import type { IssueWithScore, RepoWithScore, ScoreComponent } from "@/domain/types";

type NumericLike = number | null | { toNumber: () => number };

type RepositoryRecord = {
  id: string;
  githubId: string;
  fullName: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  topics: unknown;
  stars: number;
  forks: number;
  openIssues: number;
  license: string;
  contributorCount: number;
  sizeKb: number;
  lastCommitAt: Date;
  createdAt: Date;
  updatedAt: Date;
  readinessScore: NumericLike;
  scoreConfidence: NumericLike;
  metricMaintainerResponseHours: NumericLike;
  metricNewcomerFriendlyScore: NumericLike;
  metricCodeHealthScore: NumericLike;
  metricCommunityActivityScore: NumericLike;
  metricDocumentationScore: NumericLike;
  issues?: Array<{
    state: string;
    labels: unknown;
  }>;
};

type IssueRecord = {
  id: string;
  repoId: string;
  githubId: string;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: unknown;
  assignees: unknown;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  issueReadinessScore: NumericLike;
  hasAcceptanceCriteria: boolean;
  commentCount: number;
  lastCommentAt: Date | null;
  firstResponseHours: NumericLike;
  isStale: boolean;
};

export function mapRepositoryRecord(record: RepositoryRecord): RepoWithScore {
  const breakdown = repositoryBreakdown(record);
  const readinessScore = toNumber(record.readinessScore);

  return {
    id: record.id,
    githubId: record.githubId,
    fullName: record.fullName,
    owner: record.owner,
    name: record.name,
    description: record.description,
    language: record.language,
    topics: toStringArray(record.topics),
    stars: record.stars,
    forks: record.forks,
    openIssues: record.openIssues,
    license: record.license,
    contributorCount: record.contributorCount,
    sizeKb: record.sizeKb,
    lastCommitAt: record.lastCommitAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    metrics: {
      maintainerResponseHours: toNullableNumber(record.metricMaintainerResponseHours),
      hasContributingGuide: toNumber(record.metricNewcomerFriendlyScore) >= 70,
      hasIssueTemplates: toNumber(record.metricNewcomerFriendlyScore) >= 70,
      hasGoodFirstIssueLabel: hasGoodFirstIssue(record),
      averagePrMergeDays: null,
      ciPassRate: null,
      testCoveragePercent: null,
      openCriticalBugs: 0,
      hasCodeOfConduct: toNumber(record.metricCommunityActivityScore) >= 60,
      commitsPerDay: 0,
      activeContributors30d: record.contributorCount,
      readmeLength: 0,
      hasChangelog: false,
      hasApiDocs: toNumber(record.metricDocumentationScore) >= 70,
      hasExamples: toNumber(record.metricDocumentationScore) >= 70
    },
    readiness: {
      score: readinessScore,
      confidence: toNumber(record.scoreConfidence),
      breakdown,
      explanation: `Repository readiness score is ${readinessScore}.`,
      warnings: []
    },
    hasGoodFirstIssue: hasGoodFirstIssue(record)
  };
}

export function mapIssueRecord(record: IssueRecord): IssueWithScore {
  const readinessScore = toNumber(record.issueReadinessScore);

  return {
    id: record.id,
    repoId: record.repoId,
    githubId: record.githubId,
    number: record.number,
    title: record.title,
    body: record.body,
    state: record.state,
    labels: toStringArray(record.labels),
    assignees: toStringArray(record.assignees),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    closedAt: record.closedAt?.toISOString() ?? null,
    lastCommentAt: record.lastCommentAt?.toISOString() ?? null,
    firstResponseHours: toNullableNumber(record.firstResponseHours),
    isStale: record.isStale,
    difficulty: readinessScore >= 80 ? "easy" : readinessScore >= 60 ? "medium" : "hard",
    metrics: {
      bodyWordCount: record.body.split(/\s+/).filter(Boolean).length,
      acceptanceCriteriaCount: record.hasAcceptanceCriteria ? 1 : 0,
      commentCount: record.commentCount,
      maintainerCommentCount: 0,
      ageHours: 0,
      assigneeCount: toStringArray(record.assignees).length
    },
    readiness: {
      score: readinessScore,
      confidence: 80,
      breakdown: [],
      explanation: `Issue readiness score is ${readinessScore}.`,
      warnings: []
    }
  };
}

function repositoryBreakdown(record: RepositoryRecord): ScoreComponent[] {
  return [
    ["newcomer_friendly", "Newcomer friendly", record.metricNewcomerFriendlyScore],
    ["code_health", "Code health", record.metricCodeHealthScore],
    ["community_activity", "Community activity", record.metricCommunityActivityScore],
    ["documentation", "Documentation", record.metricDocumentationScore]
  ].map(([key, label, value]) => {
    const score = toNumber(value as NumericLike);

    return {
      key: key as string,
      label: label as string,
      score,
      weightedScore: score,
      weight: 1,
      raw: `${score}`
    };
  });
}

function hasGoodFirstIssue(record: RepositoryRecord): boolean {
  return (
    record.issues?.some(
      (issue) =>
        issue.state === "open" &&
        toStringArray(issue.labels).some((label) => label.toLowerCase() === "good first issue")
    ) ?? false
  );
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toNullableNumber(value: NumericLike): number | null {
  if (value === null) {
    return null;
  }

  return toNumber(value);
}

function toNumber(value: NumericLike): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    return value.toNumber();
  }

  return 0;
}
