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

function contentResponses() {
  return [
    githubResponse({
      content: Buffer.from("API reference\n\n```ts\nexample()\n```").toString("base64"),
      encoding: "base64"
    }),
    githubResponse({ name: "CONTRIBUTING.md" }),
    githubResponse([{ name: "bug.yml" }]),
    githubResponse({ name: "CODE_OF_CONDUCT.md" }),
    githubResponse({ name: "CODE_OF_CONDUCT.md" }, 404),
    githubResponse({ name: "CHANGELOG.md" })
  ];
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
    for (const response of contentResponses()) {
      fetcher.mockResolvedValueOnce(response);
    }
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
    for (const response of contentResponses()) {
      fetcher.mockResolvedValueOnce(response);
    }
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
          metricNewcomerFriendlyScore: 50,
          metricDocumentationScore: 70,
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

  it("skips ScoreLog when the client does not provide scoreLog", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(githubResponse(repository()))
      .mockResolvedValueOnce(githubResponse([issue()]));
    for (const response of contentResponses()) {
      fetcher.mockResolvedValueOnce(response);
    }
    const db = client(); // no scoreLog property

    // Should not throw
    const result = await ingestGitHubRepositories(db, ["owner/project"], { fetcher, now });

    expect(result.totals.succeeded).toBe(1);
  });

  it("writes a ScoreLog with oldScore=null on first ingestion", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(githubResponse(repository()))
      .mockResolvedValueOnce(githubResponse([issue()]));
    for (const response of contentResponses()) {
      fetcher.mockResolvedValueOnce(response);
    }
    const scoreLogCreate = vi.fn().mockResolvedValue({});
    const db = {
      ...client(),
      scoreLog: { create: scoreLogCreate }
    };
    // upsert returns no readinessScore → simulates first-time ingestion (no prior score)
    db.repository.upsert.mockResolvedValue({ id: "repo_1", fullName: "owner/project" });

    await ingestGitHubRepositories(db, ["owner/project"], { fetcher, now });

    expect(scoreLogCreate).toHaveBeenCalledOnce();
    expect(scoreLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repoId: "repo_1",
          oldScore: null,
          newScore: expect.any(Number),
          deltaReason: expect.objectContaining({ explanation: expect.stringContaining("Initial readiness score") }),
          metricChanges: {}
        })
      })
    );
  });

  it("writes a ScoreLog when score delta exceeds threshold", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(githubResponse(repository()))
      .mockResolvedValueOnce(githubResponse([issue()]));
    for (const response of contentResponses()) {
      fetcher.mockResolvedValueOnce(response);
    }
    const scoreLogCreate = vi.fn().mockResolvedValue({});
    const db = {
      ...client(),
      scoreLog: { create: scoreLogCreate }
    };
    // upsert returns a prior readinessScore far from the newly computed value
    db.repository.upsert.mockResolvedValue({ id: "repo_1", fullName: "owner/project", readinessScore: 10 });

    await ingestGitHubRepositories(db, ["owner/project"], { fetcher, now });

    expect(scoreLogCreate).toHaveBeenCalledOnce();
    expect(scoreLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repoId: "repo_1",
          oldScore: 10,
          newScore: expect.any(Number),
          deltaReason: expect.objectContaining({ explanation: expect.stringContaining("Score changed from") })
        })
      })
    );
  });

  it("skips ScoreLog when score delta is below threshold", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(githubResponse(repository()))
      .mockResolvedValueOnce(githubResponse([issue()]));
    for (const response of contentResponses()) {
      fetcher.mockResolvedValueOnce(response);
    }
    const scoreLogCreate = vi.fn().mockResolvedValue({});
    const db = {
      ...client(),
      scoreLog: { create: scoreLogCreate }
    };

    // Compute what the real score will be, then feed back exactly that score
    // so delta = 0 < 0.5 threshold → no ScoreLog
    const capturedScore = await (async () => {
      const plainDb = client();
      const f = vi
        .fn()
        .mockResolvedValueOnce(githubResponse(repository()))
        .mockResolvedValueOnce(githubResponse([issue()]));
      for (const response of contentResponses()) {
        f.mockResolvedValueOnce(response);
      }
      const r = await ingestGitHubRepositories(plainDb, ["owner/project"], { fetcher: f, now });
      return (r.repositories[0] as { readinessScore: number }).readinessScore;
    })();

    db.repository.upsert.mockResolvedValue({
      id: "repo_1",
      fullName: "owner/project",
      readinessScore: capturedScore
    });

    await ingestGitHubRepositories(db, ["owner/project"], { fetcher, now });

    expect(scoreLogCreate).not.toHaveBeenCalled();
  });
});
