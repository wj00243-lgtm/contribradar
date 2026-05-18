import { parseGitHubIngestionRepos } from "@/server/github-ingestion-config";
import { ingestGitHubRepositories, type GitHubIngestionDbClient } from "@/server/github-ingestion";
import { jsonError, jsonOk } from "@/server/http";

type Dependencies = {
  cronSecret?: string;
  githubToken?: string;
  repositoryConfig?: string | string[] | null;
  client: GitHubIngestionDbClient | unknown;
  ingestRepositories: typeof ingestGitHubRepositories;
};

export function createIngestGitHubCronHandler({
  cronSecret,
  githubToken,
  repositoryConfig,
  client,
  ingestRepositories
}: Dependencies) {
  return async function GET(request: Request) {
    if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return jsonError(401, "CRON_UNAUTHORIZED", "Cron authorization failed.");
    }

    const repositories = parseGitHubIngestionRepos(repositoryConfig);

    if (repositories.length === 0) {
      return jsonOk({
        skipped: true,
        reason: "GITHUB_INGEST_REPOS is empty.",
        repositories: [],
        totals: {
          requested: 0,
          succeeded: 0,
          failed: 0,
          issuesUpserted: 0
        }
      });
    }

    if (repositories.length > 10) {
      return jsonError(
        500,
        "GITHUB_INGEST_REPOS_INVALID",
        "GITHUB_INGEST_REPOS must contain at most 10 repositories."
      );
    }

    const result = await ingestRepositories(client as GitHubIngestionDbClient, repositories, {
      token: githubToken
    });

    return jsonOk({
      skipped: false,
      ...result
    });
  };
}
