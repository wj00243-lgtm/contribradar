import { discoverRepositories } from "@/server/discovery";
import { jsonOk, readBoolean, readNumber, readStringList } from "@/server/http";
import type { SortMode } from "@/domain/types";

const sortModes = new Set<SortMode>(["score", "stars", "activity", "response_time"]);

function readSort(value: string | null): SortMode {
  return value !== null && sortModes.has(value as SortMode) ? (value as SortMode) : "score";
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const result = discoverRepositories({
    language: url.searchParams.get("language") ?? undefined,
    topics: readStringList(url.searchParams.get("topics")),
    minScore: readNumber(url.searchParams.get("min_score")),
    hasGoodFirstIssue: readBoolean(url.searchParams.get("has_good_first_issue")),
    lastActiveWithinDays: readNumber(url.searchParams.get("last_active_within_days")),
    sort: readSort(url.searchParams.get("sort")),
    page: readNumber(url.searchParams.get("page")) ?? 1,
    limit: readNumber(url.searchParams.get("limit")) ?? 20
  });

  return jsonOk({
    repos: result.repos,
    total: result.total,
    facets: result.facets
  });
}
