import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests until the limit is reached within the window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => 1000 });

    expect(limiter.check("user_1")).toEqual({ allowed: true, remaining: 1, resetAt: 61_000 });
    expect(limiter.check("user_1")).toEqual({ allowed: true, remaining: 0, resetAt: 61_000 });
    expect(limiter.check("user_1")).toEqual({ allowed: false, remaining: 0, resetAt: 61_000 });
  });

  it("resets the bucket after the window expires", () => {
    let now = 1000;
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => now });

    expect(limiter.check("user_1").allowed).toBe(true);
    expect(limiter.check("user_1").allowed).toBe(false);

    now = 62_000;

    expect(limiter.check("user_1")).toEqual({ allowed: true, remaining: 0, resetAt: 122_000 });
  });
});
