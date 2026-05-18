import { jsonError } from "@/server/http";

type CronAuthorizationOptions = {
  allowMissingSecret?: boolean;
};

import crypto from "node:crypto";

export function authorizeCronRequest(
  request: Request,
  cronSecret?: string,
  { allowMissingSecret = process.env.NODE_ENV !== "production" }: CronAuthorizationOptions = {}
) {
  if (!cronSecret) {
    if (allowMissingSecret) {
      return null;
    }

    return jsonError(503, "CRON_AUTH_NOT_CONFIGURED", "Cron authorization is not configured.");
  }

  const authHeader = request.headers.get("authorization") || "";
  const expectedHeader = `Bearer ${cronSecret}`;

  if (!secureCompare(authHeader, expectedHeader)) {
    return jsonError(401, "CRON_UNAUTHORIZED", "Cron authorization failed.");
  }

  return null;
}

function secureCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
