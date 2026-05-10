import { describe, expect, it } from "vitest";

import { getPersistenceMode, shouldAllowSeedFallback } from "./persistence-mode";

describe("persistence mode", () => {
  it("uses database-only mode in production", () => {
    expect(getPersistenceMode({ NODE_ENV: "production" })).toBe("database");
    expect(shouldAllowSeedFallback({ NODE_ENV: "production" })).toBe(false);
  });

  it("allows seed fallback outside production", () => {
    expect(getPersistenceMode({ NODE_ENV: "development" })).toBe("database-with-seed-fallback");
    expect(shouldAllowSeedFallback({ NODE_ENV: "test" })).toBe(true);
  });
});
