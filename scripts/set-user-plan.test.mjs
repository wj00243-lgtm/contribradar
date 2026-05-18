import { describe, expect, it, vi } from "vitest";

import { parseArgs, setUserPlan, userLookupWhere, validateArgs } from "./set-user-plan.mjs";

describe("set-user-plan", () => {
  it("parses user, plan, and apply arguments", () => {
    expect(parseArgs(["--user=275561449", "--plan=pro", "--apply"])).toEqual({
      apply: true,
      plan: "pro",
      user: "275561449"
    });
  });

  it("validates required user ref and known plans", () => {
    expect(validateArgs({ user: "", plan: "gold", apply: false })).toEqual([
      "Missing required argument: --user=<id|email|githubId|displayName>",
      "Missing or invalid required argument: --plan=<free|pro|team>"
    ]);
  });

  it("searches by id, email, github id, or display name without raw SQL column names", () => {
    expect(userLookupWhere("wj00243")).toEqual({
      OR: [
        { id: "wj00243" },
        { email: "wj00243" },
        { githubId: "wj00243" },
        { displayName: "wj00243" }
      ]
    });
  });

  it("dry-runs a single matched user without updating", async () => {
    const user = { id: "user_1", email: "ada@example.com", githubId: "123", displayName: "Ada", plan: "free" };
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([user]),
        update: vi.fn()
      }
    };

    await expect(setUserPlan(prisma, { user: "123", plan: "pro", apply: false })).resolves.toEqual({
      ok: true,
      status: "dry_run",
      user,
      nextPlan: "pro"
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("updates the user plan only when apply is true", async () => {
    const user = { id: "user_1", email: "ada@example.com", githubId: "123", displayName: "Ada", plan: "free" };
    const updated = { ...user, plan: "pro" };
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([user]),
        update: vi.fn().mockResolvedValue(updated)
      }
    };

    await expect(setUserPlan(prisma, { user: "123", plan: "pro", apply: true })).resolves.toEqual({
      ok: true,
      status: "updated",
      user: updated,
      previousPlan: "free"
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { plan: "pro" },
      select: {
        id: true,
        email: true,
        githubId: true,
        displayName: true,
        plan: true
      }
    });
  });

  it("requires an exact id when the lookup is ambiguous", async () => {
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: "user_1", email: "a@example.com", githubId: "1", displayName: "Ada", plan: "free" },
          { id: "user_2", email: "b@example.com", githubId: "2", displayName: "Ada", plan: "free" }
        ])
      }
    };

    await expect(setUserPlan(prisma, { user: "Ada", plan: "pro", apply: true })).resolves.toMatchObject({
      ok: false,
      status: "ambiguous"
    });
  });
});
