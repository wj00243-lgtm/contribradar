import { parseGitHubIngestionRepos } from "@/server/github-ingestion-config";
import { ingestGitHubRepositories, type GitHubIngestionDbClient } from "@/server/github-ingestion";
import { jsonError, jsonOk } from "@/server/http";
import {
  completeCronRun,
  failCronRun,
  startCronRun,
  type OpsObservabilityClient
} from "@/server/ops-observability";

type Dependencies = {
  cronSecret?: string;
  githubToken?: string;
  repositoryConfig?: string | string[] | null;
  client: GitHubIngestionDbClient | unknown;
  completeCronRun?: typeof completeCronRun;
  failCronRun?: typeof failCronRun;
  ingestRepositories: typeof ingestGitHubRepositories;
  now?: () => Date;
  startCronRun?: typeof startCronRun;
};

export function createIngestGitHubCronHandler({
  cronSecret,
  githubToken,
  repositoryConfig,
  client,
  completeCronRun: completeRun = completeCronRun,
  failCronRun: failRun = failCronRun,
  ingestRepositories,
  now = () => new Date(),
  startCronRun: startRun = startCronRun
}: Dependencies) {
  return async function GET(request: Request) {
    if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return jsonError(401, "CRON_UNAUTHORIZED", "Cron authorization failed.");
    }

    const ingestionClient = client as GitHubIngestionDbClient;
    const observabilityClient = client as OpsObservabilityClient;
    const run = await startRun(observabilityClient, "ingest-github", now());
    const repositories = parseGitHubIngestionRepos(repositoryConfig);

    if (repositories.length === 0) {
      await completeRun(observabilityClient, run, {
        status: "succeeded",
        usersChecked: 0,
        alertsCreated: 0,
        failures: 0,
        finishedAt: now()
      });

      return jsonOk({
        skipped: true,
        reason: "GITHUB_INGEST_REPOS is empty.",
        runId: run?.id ?? null,
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
      const error = new Error("GITHUB_INGEST_REPOS must contain at most 10 repositories.");
      await failRun(observabilityClient, run, error, now());

      return jsonError(
        500,
        "GITHUB_INGEST_REPOS_INVALID",
        error.message
      );
    }

    try {
      const result = await ingestRepositories(ingestionClient, repositories, {
        token: githubToken
      });

      await completeRun(observabilityClient, run, {
        status: "succeeded",
        usersChecked: result.totals.requested,
        alertsCreated: result.totals.issuesUpserted,
        failures: result.totals.failed,
        finishedAt: now()
      });

      return jsonOk({
        skipped: false,
        runId: run?.id ?? null,
        ...result
      });
    } catch (error) {
      await failRun(observabilityClient, run, error, now());
      throw error;
    }
  };
}
