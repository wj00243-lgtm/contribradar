import { describe, expect, it } from "vitest";

import { normalizeAlertPreferences } from "./alert-preferences";

describe("normalizeAlertPreferences", () => {
  it("returns conservative defaults when preferences are missing", () => {
    expect(normalizeAlertPreferences(undefined)).toEqual({
      email: false,
      slack: false,
      digest: "weekly"
    });
  });

  it("normalizes boolean delivery flags and digest frequency", () => {
    expect(normalizeAlertPreferences({ email: true, slack: true, digest: "daily" })).toEqual({
      email: true,
      slack: true,
      digest: "daily"
    });
  });

  it("falls back to weekly digest for unsupported values", () => {
    expect(normalizeAlertPreferences({ email: "yes", slack: null, digest: "hourly" })).toEqual({
      email: false,
      slack: false,
      digest: "weekly"
    });
  });
});
