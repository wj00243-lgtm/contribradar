import { describe, expect, it } from "vitest";

import { GET } from "./route";

async function getRepos(query = "") {
  return GET(new Request(`http://localhost/api/v1/discover/repos${query}`));
}

describe("GET /api/v1/discover/repos", () => {
  it("returns the default repository discovery response when filters are absent", async () => {
    const response = await getRepos();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.repos.length).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
    expect(body.facets.languages.length).toBeGreaterThan(0);
  });

  it.each([
    ["malformed min_score", "?min_score=abc", "min_score"],
    ["out-of-range min_score", "?min_score=101", "min_score"],
    ["invalid has_good_first_issue", "?has_good_first_issue=yes", "has_good_first_issue"],
    ["invalid sort", "?sort=recent", "sort"],
    ["page below one", "?page=0", "page"],
    ["non-numeric page", "?page=abc", "page"],
    ["limit below one", "?limit=0", "limit"],
    ["limit above one hundred", "?limit=101", "limit"],
    ["non-numeric limit", "?limit=abc", "limit"]
  ])("returns 400 for %s", async (_name, query, field) => {
    const response = await getRepos(query);
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
