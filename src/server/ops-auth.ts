import { jsonError } from "@/server/http";

export function authorizeOpsRequest(request: Request, opsApiKey?: string) {
  if (!opsApiKey) {
    return jsonError(503, "OPS_AUTH_NOT_CONFIGURED", "Ops authorization is not configured.");
  }

  if (request.headers.get("authorization") !== `Bearer ${opsApiKey}`) {
    return jsonError(401, "OPS_UNAUTHORIZED", "Ops authorization failed.");
  }

  return null;
}
