import { describe, expect, it, vi } from "vitest";

import { ingestGitHubRepositories } from "./github-ingestion";

const now = new Date("2026-05-18T12:00:00.000Z");

function githubResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function repository(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    full_name: "owner/project",
    owner: { login: "owner" },
    name: "project",
    description: "A useful project",
    language: "TypeScript",
    topics: ["developer-tools"],
    stargazers_count: 120,
    forks_count: 10,
    open_issues_count: 3,
    license: { spdx_id: "MIT" },
    size: 2048,
    pushed_at: "2026-05-17T12:00:00.000Z",
    created_at: "2025-01-01T12:00:00.000Z",
    updated_at: "2026-05-18T10:00:00.000Z",
    ...overrides
  };
}

function issue(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    number: 7,
    title: "Improve setup guide",
    body: "Acceptance criteria\n- [ ] Add Windows setup notes",
    state: "open",
    labels: [{ name: "good first issue" }, { name: "documentation" }],
    assignees: [],
    created_at: "2026-05-17T12:00:00.000Z",
    updated_at: "2026-05-18T09:00:00.000Z",
    closed_at: null,
    comments: 2,
    ...overrides
  };
}

function client() {
  return {
    repository: {
      upsert: vi.fn().mockResolvedValue({ id: "repo_1", fullName: "owner/project" })
    },
    issue: {
      upsert: vi.fn().mockResolvedValue({ id: "issue_1" })
    }
  };
}

describe("GitHub ingestion", () => {
  it("fetches GitHub repository and issues with the expected headers", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(githubResponse(repository()))
      .mockResolvedValueOnce(githubResponse([issue()]));
    const db = client();

    await ingestGitHubRepositories(db, ["owner/project"], {
      fetcher,
      token: "github_token",
      now
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/owner/project",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          Authorization: "Bearer github_token",
          "User-Agent": "ContribRadar"
        })
      })
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/owner/project/issues?state=open&per_page=20",
      expect.any(Object)
    );
  });

  it("upserts repositories and issues while filtering pull requests from the issues endpoint", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(githubResponse(repository()))
      .mockResolvedValueOnce(githubResponse([issue(), issue({ id: 101, pull_request: { url: "pr" } })]));
    const db = client();

    const result = await ingestGitHubRepositories(db, ["owner/project"], {
      fetcher,
      now
    });

    expect(result.totals).toEqual({
      requested: 1,
      succeeded: 1,
      failed: 0,
      issuesUpserted: 1
    });
    expect(db.repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { githubId: "42" },
        create: expect.objectContaining({
          fullName: "owner/project",
          language: "TypeScript",
          topics: ["developer-tools"],
          readinessScore: expect.any(Number)
        })
      })
    );
    expect(db.issue.upsert).toHaveBeenCalledTimes(1);
    expect(db.issue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { githubId: "100" },
        create: expect.objectContaining({
          repoId: "repo_1",
          number: 7,
          labels: ["good first issue", "documentation"],
          hasAcceptanceCriteria: true,
          issueReadinessScore: expect.any(Number)
        })
      })
    );
  });

  it("reports invalid repository refs without writing to the database", async () => {
    const db = client();

    const result = await ingestGitHubRepositories(db, ["owner/project/extra"], { now });

    expect(result.repositories[0]).toEqual({
      repository: "owner/project/extra",
      status: "failed",
      error: {
        code: "INVALID_REPOSITORY_REF",
        message: "Repository must use the owner/repo format."
      }
    });
    expect(db.repository.upsert).not.toHaveBeenCalled();
    expect(db.issue.upsert).not.toHaveBeenCalled();
  });

  it("reports GitHub fetch failures per repository", async () => {
    const fetcher = vi.fn().mockResolvedValue(githubResponse({ message: "Not Found" }, 404));
    const db = client();

    const result = await ingestGitHubRepositories(db, ["owner/missing"], {
      fetcher,
      now
    });

    expect(result.totals.failed).toBe(1);
    expect(result.repositories[0]).toMatchObject({
      repository: "owner/missing",
      status: "failed",
      error: { code: "GITHUB_FETCH_FAILED" }
    });
  });
});
