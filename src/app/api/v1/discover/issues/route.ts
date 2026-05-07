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
  const params = new URL(request.url).searchParams;
  const result = discoverIssues({
    repoId: params.get("repo_id") ?? undefined,
    labels: readStringList(params.get("labels")),
    minIssueScore: readNumber(params.get("min_issue_score")),
    isStale: readBoolean(params.get("is_stale")),
    hasNoAssignee: readBoolean(params.get("has_no_assignee")),
    difficulty: readDifficulty(params.get("difficulty")),
    page: readNumber(params.get("page")),
    limit: readNumber(params.get("limit"))
  });

  return jsonOk({
    issues: result.issues,
    total: result.total
  });
}
