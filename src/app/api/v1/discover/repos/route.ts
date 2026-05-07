import { discoverRepositories } from "@/server/discovery";
import { jsonOk, readBoolean, readNumber, readStringList } from "@/server/http";
import type { SortMode } from "@/domain/types";

const sortModes = new Set<SortMode>(["score", "stars", "activity", "response_time"]);

function readSort(value: string | null): SortMode {
  return value !== null && sortModes.has(value as SortMode) ? (value as SortMode) : "score";
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = discoverRepositories({
    language: params.get("language") ?? undefined,
    topics: readStringList(params.get("topics")),
    minScore: readNumber(params.get("min_score")),
    hasGoodFirstIssue: readBoolean(params.get("has_good_first_issue")),
    lastActiveWithinDays: readNumber(params.get("last_active_within_days")),
    sort: readSort(params.get("sort")),
    page: readNumber(params.get("page")),
    limit: readNumber(params.get("limit"))
  });

  return jsonOk({
    repos: result.repos,
    total: result.total,
    facets: result.facets
  });
}
