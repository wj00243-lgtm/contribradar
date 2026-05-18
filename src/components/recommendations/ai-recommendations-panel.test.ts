import { describe, expect, it } from "vitest";

import { __testables } from "./ai-recommendations-panel";

describe("AI recommendations panel helpers", () => {
  it("formats provider and quota errors for beta operators", () => {
    expect(__testables.formatRecommendationError({ error: { code: "GEMINI_NOT_CONFIGURED" } })).toContain("GEMINI_API_KEY");
    expect(__testables.formatRecommendationError({ error: { code: "GEMINI_RESPONSE_INVALID" } })).toContain("Gemini returned");
    expect(__testables.formatRecommendationError({ error: { code: "AI_RECOMMENDATION_QUOTA_EXHAUSTED" } })).toContain("quota");
  });

  it("falls back to API messages for unknown errors", () => {
    expect(__testables.formatRecommendationError({ error: { message: "Custom failure" } })).toBe("Custom failure");
    expect(__testables.formatRecommendationError({})).toBe("Recommendations could not be generated.");
  });
});
