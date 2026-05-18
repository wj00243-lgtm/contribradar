import { prisma } from "@/server/db";
import { ingestGitHubRepositories } from "@/server/github-ingestion";
import { createIngestGitHubCronHandler } from "./route-handler";

export const GET = createIngestGitHubCronHandler({
  cronSecret: process.env.CRON_SECRET,
  githubToken: process.env.GITHUB_TOKEN,
  repositoryConfig: process.env.GITHUB_INGEST_REPOS,
  client: prisma,
  ingestRepositories: ingestGitHubRepositories
});
