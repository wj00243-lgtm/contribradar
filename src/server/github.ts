const GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_GITHUB_TIMEOUT_MS = 15_000;

type Fetcher = typeof fetch;

export type GitHubRepositoryPayload = {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id?: string | null; key?: string | null } | null;
  size: number;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GitHubIssuePayload = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: Array<string | { name?: string | null }>;
  assignees: Array<{ login?: string | null }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  comments: number;
  pull_request?: unknown;
};

export type GitHubContentSignals = {
  readmeLength: number;
  hasContributingGuide: boolean;
  hasIssueTemplates: boolean;
  hasCodeOfConduct: boolean;
  hasChangelog: boolean;
  hasExamples: boolean;
  hasApiDocs: boolean;
};

export type GitHubRepoSnapshot = {
  repository: GitHubRepositoryPayload;
  issues: GitHubIssuePayload[];
  contentSignals: GitHubContentSignals;
};

export type GitHubClientOptions = {
  token?: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
  issueLimit?: number;
};

export class GitHubConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubConfigurationError";
  }
}

export class GitHubResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubResponseError";
  }
}

export async function fetchGitHubRepoSnapshot(
  fullName: string,
  { token, fetcher = fetch, timeoutMs = DEFAULT_GITHUB_TIMEOUT_MS, issueLimit = 20 }: GitHubClientOptions = {}
): Promise<GitHubRepoSnapshot> {
  const parsed = parseFullName(fullName);
  const [repository, issues, contentSignals] = await Promise.all([
    githubJson<GitHubRepositoryPayload>(`/repos/${parsed.owner}/${parsed.repo}`, { token, fetcher, timeoutMs }),
    githubJson<GitHubIssuePayload[]>(
      `/repos/${parsed.owner}/${parsed.repo}/issues?state=open&per_page=${issueLimit}`,
      { token, fetcher, timeoutMs }
    ),
    fetchContentSignals(parsed, { token, fetcher, timeoutMs })
  ]);

  if (!isValidRepositoryPayload(repository)) {
    throw new GitHubResponseError(`GitHub repository payload was invalid for /repos/${parsed.owner}/${parsed.repo}.`);
  }

  if (!Array.isArray(issues) || issues.some((issue) => !isValidIssuePayload(issue))) {
    throw new GitHubResponseError(`GitHub issue payload was invalid for /repos/${parsed.owner}/${parsed.repo}/issues.`);
  }

  return {
    repository,
    issues: issues.filter((issue) => issue.pull_request === undefined),
    contentSignals
  };
}

export function parseFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo, extra] = fullName.split("/");

  if (!owner || !repo || extra) {
    throw new GitHubConfigurationError(`Repository must be in owner/repo format: ${fullName}`);
  }

  return { owner, repo };
}

async function githubJson<T>(
  path: string,
  { token, fetcher, timeoutMs }: Required<Pick<GitHubClientOptions, "fetcher" | "timeoutMs">> & Pick<GitHubClientOptions, "token">
): Promise<T> {
  const response = await fetcher(`${GITHUB_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ContribRadar",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new GitHubResponseError(`GitHub request failed with status ${response.status} for ${path}.`);
  }

  return readJsonResponse<T>(response, path);
}

async function fetchContentSignals(
  ref: { owner: string; repo: string },
  options: Required<Pick<GitHubClientOptions, "fetcher" | "timeoutMs">> & Pick<GitHubClientOptions, "token">
): Promise<GitHubContentSignals> {
  const [readme, contributing, issueTemplates, codeOfConduct, changelog] = await Promise.all([
    optionalGithubJson<GitHubContentPayload>(`/repos/${ref.owner}/${ref.repo}/readme`, options),
    firstExistingContent(ref, ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"], options),
    optionalGithubJson<unknown>(`/repos/${ref.owner}/${ref.repo}/contents/.github/ISSUE_TEMPLATE`, options),
    firstExistingContent(ref, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"], options),
    firstExistingContent(ref, ["CHANGELOG.md", "changelog.md", "CHANGES.md"], options)
  ]);
  const readmeText = decodeContent(readme);

  return {
    readmeLength: readmeText.length,
    hasContributingGuide: contributing !== null,
    hasIssueTemplates: issueTemplates !== null,
    hasCodeOfConduct: codeOfConduct !== null,
    hasChangelog: changelog !== null,
    hasExamples: /\bexamples?\b|```/.test(readmeText.toLowerCase()),
    hasApiDocs: /\bapi\b|reference|sdk/.test(readmeText.toLowerCase())
  };
}

async function firstExistingContent(
  ref: { owner: string; repo: string },
  paths: string[],
  options: Required<Pick<GitHubClientOptions, "fetcher" | "timeoutMs">> & Pick<GitHubClientOptions, "token">
): Promise<unknown | null> {
  for (const path of paths) {
    const content = await optionalGithubJson<unknown>(
      `/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`,
      options
    );

    if (content !== null) {
      return content;
    }
  }

  return null;
}

type GitHubContentPayload = {
  content?: string | null;
  encoding?: string | null;
};

async function optionalGithubJson<T>(
  path: string,
  { token, fetcher, timeoutMs }: Required<Pick<GitHubClientOptions, "fetcher" | "timeoutMs">> & Pick<GitHubClientOptions, "token">
): Promise<T | null> {
  const response = await fetcher(`${GITHUB_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ContribRadar",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new GitHubResponseError(`GitHub request failed with status ${response.status} for ${path}.`);
  }

  return readJsonResponse<T>(response, path);
}

async function readJsonResponse<T>(response: Response, path: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new GitHubResponseError(`GitHub response payload was not readable for ${path}.`);
  }
}

function decodeContent(content: GitHubContentPayload | null): string {
  if (!content?.content || content.encoding !== "base64") {
    return "";
  }

  return Buffer.from(content.content.replace(/\s/g, ""), "base64").toString("utf8");
}

function isValidRepositoryPayload(value: unknown): value is GitHubRepositoryPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const repository = value as Partial<GitHubRepositoryPayload>;

  return (
    typeof repository.id === "number" &&
    typeof repository.full_name === "string" &&
    !!repository.owner &&
    typeof repository.owner.login === "string" &&
    typeof repository.name === "string" &&
    typeof repository.stargazers_count === "number" &&
    typeof repository.forks_count === "number" &&
    typeof repository.open_issues_count === "number" &&
    typeof repository.size === "number" &&
    typeof repository.created_at === "string" &&
    typeof repository.updated_at === "string"
  );
}

function isValidIssuePayload(value: unknown): value is GitHubIssuePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const issue = value as Partial<GitHubIssuePayload>;

  return (
    typeof issue.id === "number" &&
    typeof issue.number === "number" &&
    typeof issue.title === "string" &&
    typeof issue.body === "string" &&
    (issue.state === "open" || issue.state === "closed") &&
    Array.isArray(issue.labels) &&
    Array.isArray(issue.assignees) &&
    typeof issue.created_at === "string" &&
    typeof issue.updated_at === "string" &&
    typeof issue.comments === "number"
  );
}
