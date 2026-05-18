import { describe, expect, it, vi } from "vitest";

import { ensureUserFromSession } from "./users";

describe("ensureUserFromSession", () => {
  it("returns an existing user by session id or GitHub id", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "user_db", plan: "pro" });
    const create = vi.fn();
    const client = {
      user: {
        findFirst,
        create
      }
    };

    await expect(
      ensureUserFromSession(client, {
        id: "github_sub",
        githubId: "123",
        email: "ferit@example.com",
        plan: "free"
      })
    ).resolves.toEqual({ id: "user_db", plan: "pro" });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: "github_sub" }, { githubId: "123" }, { email: "ferit@example.com" }]
      },
      select: {
        id: true,
        plan: true
      }
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a conservative free user when the OAuth user is new", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "github_sub", plan: "free" });
    const client = {
      user: {
        findFirst,
        create
      }
    };

    await ensureUserFromSession(client, {
      id: "github_sub",
      githubId: "123",
      email: "ferit@example.com",
      name: "Ferit",
      image: "https://example.com/avatar.png",
      plan: "team"
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        id: "github_sub",
        githubId: "123",
        email: "ferit@example.com",
        displayName: "Ferit",
        avatarUrl: "https://example.com/avatar.png",
        skillVector: [],
        experienceLevel: "beginner",
        weeklyHours: 5,
        plan: "team",
        settings: {
          create: {
            alertPreferences: {
              email: false,
              slack: false,
              digest: "weekly"
            }
          }
        }
      },
      select: {
        id: true,
        plan: true
      }
    });
  });
});
