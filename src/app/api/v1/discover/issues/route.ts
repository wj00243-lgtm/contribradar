import type { Issue } from "@/domain/types";
import { discoverIssues } from "@/server/discovery";
import { jsonOk, readBoolean, readNumber, readStringList } from "@/server/http";

const difficulties = new Set<Issue["difficulty"]>(["easy", "medium", "hard"]);

function readDifficulty(value: string | null): Issue["difficulty"] | undefined {
  return value !== null && difficulties.has(value as Issue["difficulty"])
    ? (value as Issue["difficulty"])
    : undefined;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const result = discoverIssues({
    repoId: url.searchParams.get("repo_id") ?? undefined,
    labels: readStringList(url.searchParams.get("labels")),
    minIssueScore: readNumber(url.searchParams.get("min_issue_score")),
    isStale: readBoolean(url.searchParams.get("is_stale")),
    hasNoAssignee: readBoolean(url.searchParams.get("has_no_assignee")),
    difficulty: readDifficulty(url.searchParams.get("difficulty")),
    page: readNumber(url.searchParams.get("page")) ?? 1,
    limit: readNumber(url.searchParams.get("limit")) ?? 20
  });

  return jsonOk({
    issues: result.issues,
    total: result.total
  });
}
