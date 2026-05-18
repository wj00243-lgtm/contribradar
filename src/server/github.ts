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

export type GitHubRepoSnapshot = {
  repository: GitHubRepositoryPayload;
  issues: GitHubIssuePayload[];
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
  const [repository, issues] = await Promise.all([
    githubJson<GitHubRepositoryPayload>(`/repos/${parsed.owner}/${parsed.repo}`, { token, fetcher, timeoutMs }),
    githubJson<GitHubIssuePayload[]>(
      `/repos/${parsed.owner}/${parsed.repo}/issues?state=open&per_page=${issueLimit}`,
      { token, fetcher, timeoutMs }
    )
  ]);

  return {
    repository,
    issues: issues.filter((issue) => issue.pull_request === undefined)
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

  return response.json() as Promise<T>;
}
