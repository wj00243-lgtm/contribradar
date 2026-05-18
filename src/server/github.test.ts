import { describe, expect, it, vi } from "vitest";

import { fetchGitHubRepoSnapshot, GitHubConfigurationError, GitHubResponseError, parseFullName } from "./github";

describe("parseFullName", () => {
  it("parses owner/repo names", () => {
    expect(parseFullName("vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("rejects malformed names", () => {
    expect(() => parseFullName("vercel")).toThrow(GitHubConfigurationError);
    expect(() => parseFullName("a/b/c")).toThrow(GitHubConfigurationError);
  });
});

describe("fetchGitHubRepoSnapshot", () => {
  it("fetches repository and non-PR issues with GitHub headers", async () => {
    const readmeText = "API reference\n\n```ts\nexample()\n```";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            full_name: "vercel/next.js",
            owner: { login: "vercel" },
            name: "next.js",
            description: "The React Framework",
            language: "TypeScript",
            topics: ["react"],
            stargazers_count: 100,
            forks_count: 20,
            open_issues_count: 5,
            license: { spdx_id: "MIT" },
            size: 1000,
            pushed_at: "2026-05-18T00:00:00Z",
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: 10, number: 1, title: "Bug", body: "Fix me", state: "open", labels: [], assignees: [], created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-02T00:00:00Z", closed_at: null, comments: 0 },
            { id: 11, number: 2, title: "PR", body: "", state: "open", labels: [], assignees: [], created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-02T00:00:00Z", closed_at: null, comments: 0, pull_request: {} }
          ]),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: Buffer.from(readmeText).toString("base64"),
            encoding: "base64"
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "CONTRIBUTING.md" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ name: "bug.yml" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "CODE_OF_CONDUCT.md" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "CHANGELOG.md" }), { status: 200 }));

    const snapshot = await fetchGitHubRepoSnapshot("vercel/next.js", {
      token: "ghp_test",
      fetcher
    });

    expect(snapshot.repository.full_name).toBe("vercel/next.js");
    expect(snapshot.issues).toHaveLength(1);
    expect(snapshot.contentSignals).toEqual({
      readmeLength: readmeText.length,
      hasContributingGuide: true,
      hasIssueTemplates: true,
      hasCodeOfConduct: true,
      hasChangelog: true,
      hasExamples: true,
      hasApiDocs: true
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.github.com/repos/vercel/next.js",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_test",
          Accept: "application/vnd.github+json"
        })
      })
    );
  });

  it("wraps non-2xx GitHub responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));

    await expect(fetchGitHubRepoSnapshot("vercel/missing", { fetcher })).rejects.toBeInstanceOf(GitHubResponseError);
  });

  it("treats missing optional content files as absent signals", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            full_name: "vercel/next.js",
            owner: { login: "vercel" },
            name: "next.js",
            description: "The React Framework",
            language: "TypeScript",
            topics: ["react"],
            stargazers_count: 100,
            forks_count: 20,
            open_issues_count: 5,
            license: { spdx_id: "MIT" },
            size: 1000,
            pushed_at: "2026-05-18T00:00:00Z",
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2026-05-18T00:00:00Z"
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValue(new Response("missing", { status: 404 }));

    const snapshot = await fetchGitHubRepoSnapshot("vercel/next.js", { fetcher });

    expect(snapshot.contentSignals).toEqual({
      readmeLength: 0,
      hasContributingGuide: false,
      hasIssueTemplates: false,
      hasCodeOfConduct: false,
      hasChangelog: false,
      hasExamples: false,
      hasApiDocs: false
    });
  });
});
