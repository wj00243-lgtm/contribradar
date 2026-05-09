import { jsonError, jsonOk } from "@/server/http";
import { checkSmartAlerts, listAlerts, SmartAlertPlanError, SmartAlertUserError, type AlertClient } from "@/server/alerts";

type SessionLike = {
  user?: {
    id?: string;
  };
} | null;

type GetDependencies = {
  auth: () => Promise<SessionLike>;
  client: AlertClient | unknown;
  listAlerts: typeof listAlerts;
};

type PostDependencies = {
  auth: () => Promise<SessionLike>;
  client: AlertClient | unknown;
  checkSmartAlerts: typeof checkSmartAlerts;
};

export function createAlertsGetHandler({ auth: getSession, client, listAlerts: getAlerts }: GetDependencies) {
  return async function GET(_request: Request) {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to view alerts.");
    }

    return jsonOk(await getAlerts(client as AlertClient, userId));
  };
}

export function createAlertsPostHandler({ auth: getSession, client, checkSmartAlerts: checkAlerts }: PostDependencies) {
  return async function POST(_request: Request) {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to check alerts.");
    }

    try {
      return jsonOk(await checkAlerts(client as AlertClient, userId));
    } catch (error) {
      if (error instanceof SmartAlertPlanError) {
        return jsonError(403, "PRO_FEATURE_REQUIRED", "Smart alerts require a Pro plan.");
      }

      if (error instanceof SmartAlertUserError) {
        return jsonError(404, "USER_NOT_FOUND", "The authenticated user was not found.");
      }

      return jsonError(500, "SMART_ALERT_CHECK_FAILED", "Smart alerts could not be checked.");
    }
  };
}
