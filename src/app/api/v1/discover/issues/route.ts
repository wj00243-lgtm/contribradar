import type { Issue } from "@/domain/types";
import { discoverIssues } from "@/server/discovery";
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

const difficulties = new Set<Issue["difficulty"]>(["easy", "medium", "hard"]);

export function GET(request: Request) {
  const url = new URL(request.url);
  const errors: QueryFieldErrors = {};
  const minIssueScore = readQueryNumber(url.searchParams, "min_issue_score", errors, {
    min: 0,
    max: 100
  });
  const isStale = readQueryBoolean(url.searchParams, "is_stale", errors);
  const hasNoAssignee = readQueryBoolean(url.searchParams, "has_no_assignee", errors);
  const difficulty = readQueryEnum(url.searchParams, "difficulty", difficulties, errors);
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

  const result = discoverIssues({
    repoId: url.searchParams.get("repo_id") ?? undefined,
    labels: readStringList(url.searchParams.get("labels")),
    minIssueScore,
    isStale,
    hasNoAssignee,
    difficulty,
    page: page ?? 1,
    limit: limit ?? 20
  });

  return jsonOk({
    issues: result.issues,
    total: result.total
  });
}
