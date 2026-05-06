import type { Issue, Repository, ScoreComponent, ScoreResult } from "./types";

const REPOSITORY_WEIGHTS = {
  maintainer_responsiveness: 0.3,
  newcomer_friendly: 0.25,
  code_health: 0.2,
  community_activity: 0.15,
  documentation: 0.1
} as const;

const ISSUE_WEIGHTS = {
  clarity: 0.35,
  engagement: 0.25,
  recency: 0.2,
  assignee: 0.15,
  labels: 0.05
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function component(
  key: string,
  label: string,
  score: number,
  weight: number,
  raw: string
): ScoreComponent {
  const normalizedScore = round(clamp(score), 1);

  return {
    key,
    label,
    score: normalizedScore,
    weightedScore: round(normalizedScore * weight, 1),
    weight,
    raw
  };
}

function totalScore(breakdown: ScoreComponent[]): number {
  return round(
    clamp(breakdown.reduce((total, part) => total + part.weightedScore, 0))
  );
}

function confidenceFromScore(score: number): number {
  return round(clamp(12 - score / 10, 1, 12));
}

function bestLabelScore(labels: string[]): number {
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  if (normalizedLabels.includes("good first issue")) {
    return 100;
  }

  if (normalizedLabels.includes("help wanted")) {
    return 70;
  }

  if (normalizedLabels.includes("documentation")) {
    return 60;
  }

  return 25;
}

export function scoreRepositoryReadiness(repo: Repository): ScoreResult {
  const { metrics } = repo;
  const maintainerScore =
    metrics.maintainerResponseHours === null
      ? 35
      : 100 / (1 + metrics.maintainerResponseHours / 24);
  const newcomerScore =
    (metrics.hasContributingGuide ? 25 : 0) +
    (metrics.hasIssueTemplates ? 25 : 0) +
    (metrics.hasGoodFirstIssueLabel ? 25 : 0) +
    (metrics.averagePrMergeDays !== null && metrics.averagePrMergeDays < 7
      ? 25
      : 0);
  const criticalBugPoints = clamp(20 - metrics.openCriticalBugs * 5);
  const codeHealthScore =
    (metrics.ciPassRate ?? 0) * 40 +
    ((metrics.testCoveragePercent ?? 0) / 100) * 30 +
    criticalBugPoints +
    (metrics.hasCodeOfConduct ? 10 : 0);
  const communityActivityScore = Math.min(
    100,
    metrics.commitsPerDay * 10 + metrics.activeContributors30d * 2
  );
  const documentationScore =
    (metrics.readmeLength > 500 ? 30 : 0) +
    (metrics.hasChangelog ? 20 : 0) +
    (metrics.hasApiDocs ? 25 : 0) +
    (metrics.hasExamples ? 25 : 0);
  const breakdown = [
    component(
      "maintainer_responsiveness",
      "Maintainer responsiveness",
      maintainerScore,
      REPOSITORY_WEIGHTS.maintainer_responsiveness,
      `${metrics.maintainerResponseHours ?? "unknown"} response hours`
    ),
    component(
      "newcomer_friendly",
      "Newcomer friendly",
      newcomerScore,
      REPOSITORY_WEIGHTS.newcomer_friendly,
      "contributing guide, issue templates, good-first label, merge speed"
    ),
    component(
      "code_health",
      "Code health",
      codeHealthScore,
      REPOSITORY_WEIGHTS.code_health,
      `${metrics.ciPassRate ?? 0} CI pass rate, ${metrics.testCoveragePercent ?? 0}% coverage`
    ),
    component(
      "community_activity",
      "Community activity",
      communityActivityScore,
      REPOSITORY_WEIGHTS.community_activity,
      `${metrics.commitsPerDay} commits/day, ${metrics.activeContributors30d} contributors`
    ),
    component(
      "documentation",
      "Documentation",
      documentationScore,
      REPOSITORY_WEIGHTS.documentation,
      `${metrics.readmeLength} README characters`
    )
  ];
  const score = totalScore(breakdown);
  const warnings: string[] = [];

  if (metrics.maintainerResponseHours === null || metrics.maintainerResponseHours > 72) {
    warnings.push("Maintainer response is slow.");
  }

  if (documentationScore < 50) {
    warnings.push("Documentation signals are weak.");
  }

  if (newcomerScore < 50) {
    warnings.push("Newcomer support signals are limited.");
  }

  return {
    score,
    confidence: confidenceFromScore(score),
    breakdown,
    explanation: `${repo.fullName} scores ${score} because maintainer responsiveness, newcomer signals, code health, activity, and documentation are weighted together.`,
    warnings
  };
}

export function scoreIssueReadiness(issue: Issue): ScoreResult {
  const { metrics } = issue;
  const clarityScore = clamp(
    metrics.bodyWordCount * 0.35 + metrics.acceptanceCriteriaCount * 20
  );
  const engagementScore = clamp(
    metrics.commentCount * 8 + metrics.maintainerCommentCount * 18
  );
  const recencyScore = issue.isStale ? 10 : clamp(100 - metrics.ageHours / 24);
  const assigneeScore = metrics.assigneeCount === 0 ? 100 : 25;
  const labelScore = bestLabelScore(issue.labels);
  const breakdown = [
    component("clarity", "Clarity", clarityScore, ISSUE_WEIGHTS.clarity, `${metrics.bodyWordCount} words, ${metrics.acceptanceCriteriaCount} criteria`),
    component("engagement", "Engagement", engagementScore, ISSUE_WEIGHTS.engagement, `${metrics.commentCount} comments, ${metrics.maintainerCommentCount} maintainer comments`),
    component("recency", "Recency", recencyScore, ISSUE_WEIGHTS.recency, `${metrics.ageHours} hours old`),
    component("assignee", "Assignee", assigneeScore, ISSUE_WEIGHTS.assignee, `${metrics.assigneeCount} assignees`),
    component("labels", "Labels", labelScore, ISSUE_WEIGHTS.labels, issue.labels.join(", "))
  ];
  const weightedScore = totalScore(breakdown);
  const score = issue.isStale ? Math.min(weightedScore, 39) : weightedScore;
  const warnings: string[] = [];

  if (issue.isStale) {
    warnings.push("Issue appears stale.");
  }

  if (clarityScore < 50) {
    warnings.push("Issue description is thin.");
  }

  return {
    score,
    confidence: confidenceFromScore(score),
    breakdown,
    explanation: `Issue #${issue.number} scores ${score} because issue clarity, engagement, recency, assignment, and labels are weighted together.`,
    warnings
  };
}
