import { jsonError } from "@/server/http";

import crypto from "node:crypto";

export function authorizeOpsRequest(request: Request, opsApiKey?: string) {
  if (!opsApiKey) {
    return jsonError(503, "OPS_AUTH_NOT_CONFIGURED", "Ops authorization is not configured.");
  }

  const authHeader = request.headers.get("authorization") || "";
  const expectedHeader = `Bearer ${opsApiKey}`;

  if (!secureCompare(authHeader, expectedHeader)) {
    return jsonError(401, "OPS_UNAUTHORIZED", "Ops authorization failed.");
  }

  return null;
}

function secureCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
