import { jsonOk } from "@/server/http";
import { authorizeOpsRequest } from "@/server/ops-auth";
import { listCronRuns, type OpsObservabilityClient } from "@/server/ops-observability";

type Dependencies = {
  opsApiKey?: string;
  client: OpsObservabilityClient | unknown;
  listCronRuns: typeof listCronRuns;
};

export function createCronRunsGetHandler({ opsApiKey, client, listCronRuns: getRuns }: Dependencies) {
  return async function GET(request: Request) {
    const authorizationError = authorizeOpsRequest(request, opsApiKey);

    if (authorizationError) {
      return authorizationError;
    }

    const runs = await getRuns(client as OpsObservabilityClient, { limit: 10 });

    return jsonOk({ runs });
  };
}
