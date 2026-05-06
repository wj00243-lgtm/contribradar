export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Plan = "free" | "pro" | "team";
export type SortMode = "score" | "stars" | "activity" | "response_time";

export type RepoMetrics = {
  maintainerResponseHours: number | null;
  hasContributingGuide: boolean;
  hasIssueTemplates: boolean;
  hasGoodFirstIssueLabel: boolean;
  averagePrMergeDays: number | null;
  ciPassRate: number | null;
  testCoveragePercent: number | null;
  openCriticalBugs: number;
  hasCodeOfConduct: boolean;
  commitsPerDay: number;
  activeContributors30d: number;
  readmeLength: number;
  hasChangelog: boolean;
  hasApiDocs: boolean;
  hasExamples: boolean;
};

export type Repository = {
  id: string;
  githubId: number;
  fullName: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  sizeKb: number;
  lastCommitAt: string;
  createdAt: string;
  updatedAt: string;
  metrics: RepoMetrics;
};

export type IssueMetrics = {
  bodyWordCount: number;
  acceptanceCriteriaCount: number;
  commentCount: number;
  maintainerCommentCount: number;
  ageHours: number;
  assigneeCount: number;
};

export type Issue = {
  id: string;
  repoId: string;
  githubId: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastCommentAt: string | null;
  firstResponseHours: number | null;
  isStale: boolean;
  difficulty: "easy" | "medium" | "hard";
  metrics: IssueMetrics;
};

export type ScoreComponent = {
  key: string;
  label: string;
  score: number;
  weightedScore: number;
  weight: number;
  raw: string;
};

export type ScoreResult = {
  score: number;
  confidence: number;
  breakdown: ScoreComponent[];
  explanation: string;
  warnings: string[];
};

export type RepoWithScore = Repository & {
  readiness: ScoreResult;
  hasGoodFirstIssue: boolean;
};

export type IssueWithScore = Issue & {
  readiness: ScoreResult;
};

export type DiscoverReposQuery = {
  language?: string;
  topics?: string[];
  minScore?: number;
  hasGoodFirstIssue?: boolean;
  lastActiveWithinDays?: number;
  sort: SortMode;
  page: number;
  limit: number;
};

export type DiscoverIssuesQuery = {
  repoId?: string;
  labels?: string[];
  minIssueScore?: number;
  isStale?: boolean;
  hasNoAssignee?: boolean;
  difficulty?: Issue["difficulty"];
  page: number;
  limit: number;
};

export type Watchlist = {
  id: string;
  userId: string;
  name: string;
  description: string;
  filters: {
    languages: string[];
    topics: string[];
    minScore: number;
  };
  alertEnabled: boolean;
  digestFrequency: "daily" | "weekly";
  repoIds: string[];
  createdAt: string;
};
