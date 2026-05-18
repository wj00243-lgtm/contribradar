import { z } from "zod";

import { jsonError, jsonOk } from "@/server/http";
import { ingestGitHubRepositories, type GitHubIngestionDbClient } from "@/server/github-ingestion";

const requestSchema = z.object({
  repositories: z.array(z.string().min(1)).min(1).max(10)
});

type Dependencies = {
  opsApiKey?: string;
  githubToken?: string;
  client: GitHubIngestionDbClient | unknown;
  ingestRepositories: typeof ingestGitHubRepositories;
};

export function createIngestGitHubPostHandler({
  opsApiKey,
  githubToken,
  client,
  ingestRepositories
}: Dependencies) {
  return async function POST(request: Request) {
    if (opsApiKey && request.headers.get("authorization") !== `Bearer ${opsApiKey}`) {
      return jsonError(401, "OPS_UNAUTHORIZED", "Ops authorization failed.");
    }

    const body = await readJson(request);

    if (!body.ok) {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = requestSchema.safeParse(body.value);

    if (!parsed.success) {
      return jsonError(400, "INVALID_INGESTION_REQUEST", "Request body is invalid.", parsed.error.flatten());
    }

    const result = await ingestRepositories(client as GitHubIngestionDbClient, parsed.data.repositories, {
      token: githubToken
    });

    return jsonOk(result);
  };
}

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}
