import { jsonError } from "@/server/http";

type CronAuthorizationOptions = {
  allowMissingSecret?: boolean;
};

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

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return jsonError(401, "CRON_UNAUTHORIZED", "Cron authorization failed.");
  }

  return null;
}
