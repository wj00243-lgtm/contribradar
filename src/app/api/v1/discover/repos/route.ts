import { discoverRepositories } from "@/server/discovery";
import {
  hasQueryFieldErrors,
  jsonError,
  jsonOk,
  queryValidationDetails,
  readQueryBoolean,
  readQueryEnum,
  readQueryNumber,
  readStringList,
  type QueryFieldErrors
} from "@/server/http";
import type { SortMode } from "@/domain/types";

const sortModes = new Set<SortMode>(["score", "stars", "activity", "response_time"]);

export function GET(request: Request) {
  const url = new URL(request.url);
  const errors: QueryFieldErrors = {};
  const minScore = readQueryNumber(url.searchParams, "min_score", errors, { min: 0, max: 100 });
  const hasGoodFirstIssue = readQueryBoolean(
    url.searchParams,
    "has_good_first_issue",
    errors
  );
  const lastActiveWithinDays = readQueryNumber(
    url.searchParams,
    "last_active_within_days",
    errors,
    { min: 0 }
  );
  const sort = readQueryEnum(url.searchParams, "sort", sortModes, errors);
  const page = readQueryNumber(url.searchParams, "page", errors, { min: 1 });
  const limit = readQueryNumber(url.searchParams, "limit", errors, { min: 1, max: 100 });

  if (hasQueryFieldErrors(errors)) {
    return jsonError(
      400,
      "INVALID_DISCOVERY_FILTERS",
      "Discovery filters are invalid.",
      queryValidationDetails(errors)
    );
  }

  const result = discoverRepositories({
    language: url.searchParams.get("language") ?? undefined,
    topics: readStringList(url.searchParams.get("topics")),
    minScore,
    hasGoodFirstIssue,
    lastActiveWithinDays,
    sort: sort ?? "score",
    page: page ?? 1,
    limit: limit ?? 20
  });

  return jsonOk({
    repos: result.repos,
    total: result.total,
    facets: result.facets
  });
}
