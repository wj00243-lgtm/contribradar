import { describe, expect, it } from "vitest";

import { hasFeature, meetsRequiredPlan, normalizePlan } from "./features";

describe("feature gates", () => {
  it("treats missing and unknown plans as free", () => {
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan(null)).toBe("free");
    expect(normalizePlan("enterprise")).toBe("free");
  });

  it("blocks pro features for free users", () => {
    expect(hasFeature("free", "aiRecommendations")).toBe(false);
    expect(hasFeature("free", "smartAlerts")).toBe(false);
    expect(hasFeature("free", "repoComparison")).toBe(false);
    expect(hasFeature("free", "scoreTrends")).toBe(false);
    expect(hasFeature("free", "unlimitedWatchlists")).toBe(false);
  });

  it("allows pro users to access pro intelligence features", () => {
    expect(hasFeature("pro", "aiRecommendations")).toBe(true);
    expect(hasFeature("pro", "smartAlerts")).toBe(true);
    expect(hasFeature("pro", "repoComparison")).toBe(true);
    expect(hasFeature("pro", "scoreTrends")).toBe(true);
    expect(hasFeature("pro", "unlimitedWatchlists")).toBe(true);
  });

  it("reserves team-only features for team users", () => {
    expect(hasFeature("pro", "teamDashboard")).toBe(false);
    expect(hasFeature("team", "teamDashboard")).toBe(true);
  });

  it("returns false for unknown features", () => {
    expect(hasFeature("team", "madeUpFeature")).toBe(false);
  });

  it("checks required plan hierarchy", () => {
    expect(meetsRequiredPlan("free", "pro")).toBe(false);
    expect(meetsRequiredPlan("pro", "pro")).toBe(true);
    expect(meetsRequiredPlan("team", "pro")).toBe(true);
    expect(meetsRequiredPlan("pro", "team")).toBe(false);
  });
});
