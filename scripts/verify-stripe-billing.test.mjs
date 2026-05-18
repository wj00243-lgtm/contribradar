import { describe, expect, it, vi } from "vitest";

import {
  evaluateBillingExpectation,
  getStripeBillingState,
  parseArgs,
  validateArgs
} from "./verify-stripe-billing.mjs";

describe("verify-stripe-billing", () => {
  it("parses user and expect arguments", () => {
    expect(parseArgs(["--user=user_demo", "--expect=pro"])).toEqual({
      user: "user_demo",
      expect: "pro"
    });
  });

  it("validates required user ref", () => {
    expect(validateArgs({ user: "", expect: "" })).toEqual([
      "Missing required argument: --user=<id|email|githubId|displayName>"
    ]);
  });

  it("loads user billing fields and subscription", async () => {
    const user = {
      id: "user_demo",
      email: "demo@contribradar.local",
      displayName: "Demo",
      plan: "pro",
      stripeCustomerId: "cus_123",
      subscription: {
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_123",
        status: "active",
        currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z")
      },
      settings: { isLifetimeBeta: false }
    };

    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([user])
      }
    };

    await expect(getStripeBillingState(prisma, "user_demo")).resolves.toEqual({
      ok: true,
      status: "found",
      user,
      subscription: user.subscription,
      isLifetimeBeta: false
    });
  });

  it("passes pro expectation when plan and subscription are active", () => {
    const state = {
      user: { plan: "pro", stripeCustomerId: "cus_1" },
      subscription: { status: "active" },
      isLifetimeBeta: false
    };

    expect(evaluateBillingExpectation(state, "pro")).toEqual({
      ok: true,
      checks: [
        { label: "plan is pro", pass: true },
        { label: "stripeCustomerId is set", pass: true },
        { label: "subscription row exists", pass: true },
        { label: "subscription status is active or trialing", pass: true }
      ]
    });
  });

  it("fails pro expectation when subscription is missing", () => {
    const state = {
      user: { plan: "pro", stripeCustomerId: "cus_1" },
      subscription: null,
      isLifetimeBeta: false
    };

    const evaluation = evaluateBillingExpectation(state, "pro");
    expect(evaluation.ok).toBe(false);
    expect(evaluation.checks.some((check) => check.label === "subscription row exists" && !check.pass)).toBe(true);
  });
});
