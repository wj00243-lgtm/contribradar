import { describe, expect, it } from "vitest";

import { GET } from "./route";

async function getIssues(query = "") {
  return GET(new Request(`http://localhost/api/v1/discover/issues${query}`));
}

describe("GET /api/v1/discover/issues", () => {
  it("returns the default issue discovery response when filters are absent", async () => {
    const response = await getIssues();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.issues.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
  });

  it.each([
    ["malformed min_issue_score", "?min_issue_score=abc", "min_issue_score"],
    ["out-of-range min_issue_score", "?min_issue_score=-1", "min_issue_score"],
    ["invalid is_stale", "?is_stale=yes", "is_stale"],
    ["invalid has_no_assignee", "?has_no_assignee=1", "has_no_assignee"],
    ["invalid difficulty", "?difficulty=beginner", "difficulty"],
    ["page below one", "?page=0", "page"],
    ["non-numeric page", "?page=abc", "page"],
    ["limit below one", "?limit=0", "limit"],
    ["limit above one hundred", "?limit=101", "limit"],
    ["non-numeric limit", "?limit=abc", "limit"]
  ])("returns 400 for %s", async (_name, query, field) => {
    const response = await getIssues(query);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_DISCOVERY_FILTERS",
        message: "Discovery filters are invalid.",
        details: {
          fieldErrors: expect.objectContaining({
            [field]: expect.arrayContaining([expect.any(String)])
          })
        }
      }
    });
  });
});
