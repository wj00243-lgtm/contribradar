import { jsonError, jsonOk } from "@/server/http";
import { listCronRuns, type OpsObservabilityClient } from "@/server/ops-observability";

type Dependencies = {
  opsApiKey?: string;
  client: OpsObservabilityClient | unknown;
  listCronRuns: typeof listCronRuns;
};

export function createCronRunsGetHandler({ opsApiKey, client, listCronRuns: getRuns }: Dependencies) {
  return async function GET(request: Request) {
    if (opsApiKey && request.headers.get("authorization") !== `Bearer ${opsApiKey}`) {
      return jsonError(401, "OPS_UNAUTHORIZED", "Ops authorization failed.");
    }

    const runs = await getRuns(client as OpsObservabilityClient, { limit: 10 });

    return jsonOk({ runs });
  };
}
