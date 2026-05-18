import { prisma } from "@/server/db";
import { ingestGitHubRepositories } from "@/server/github-ingestion";
import { createIngestGitHubPostHandler } from "./route-handler";

export const POST = createIngestGitHubPostHandler({
  opsApiKey: process.env.OPS_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  client: prisma,
  ingestRepositories: ingestGitHubRepositories
});
