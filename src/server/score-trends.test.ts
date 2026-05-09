import { describe, expect, it, vi } from "vitest";

import { getRepositoryScoreTrend } from "./score-trends";

describe("getRepositoryScoreTrend", () => {
  it("returns 30-day score points in chronological order with significant annotations", async () => {
    const client = {
      repository: {
        findFirst: vi.fn().mockResolvedValue({
          id: "repo_1",
          owner: "acme",
          name: "tooling",
          fullName: "acme/tooling",
          scoreLogs: [
            {
              calculatedAt: new Date("2026-05-05T00:00:00Z"),
              oldScore: 85,
              newScore: 72,
              deltaReason: { explanation: "Maintainer response slowed down." }
            },
            {
              calculatedAt: new Date("2026-04-20T00:00:00Z"),
              oldScore: 80,
              newScore: 85,
              deltaReason: { explanation: "Docs improved." }
            },
            {
              calculatedAt: new Date("2026-03-01T00:00:00Z"),
              oldScore: 70,
              newScore: 80,
              deltaReason: { explanation: "Outside window." }
            }
          ]
        })
      }
    };

    const result = await getRepositoryScoreTrend(client, "acme", "tooling", new Date("2026-05-09T00:00:00Z"));

    expect(result.status).toBe(200);
    expect(result.data?.points.map((point) => point.date)).toEqual(["2026-04-20", "2026-05-05"]);
    expect(result.data?.annotations).toEqual([
      {
        date: "2026-05-05",
        message: "Score dropped from 85 to 72 because Maintainer response slowed down."
      }
    ]);
  });

  it("returns not found for missing repositories", async () => {
    const client = {
      repository: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };

    await expect(getRepositoryScoreTrend(client, "missing", "repo")).resolves.toEqual({
      status: 404,
      error: {
        code: "REPOSITORY_NOT_FOUND",
        message: "Repository missing/repo was not found."
      }
    });
  });
});
