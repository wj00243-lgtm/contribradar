import { jsonError, jsonOk } from "@/server/http";
import { markAlertRead, type AlertClient } from "@/server/alerts";

type SessionLike = {
  user?: {
    id?: string;
  };
} | null;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchDependencies = {
  auth: () => Promise<SessionLike>;
  client: AlertClient | unknown;
  markAlertRead: typeof markAlertRead;
};

export function createAlertPatchHandler({ auth: getSession, client, markAlertRead: updateAlert }: PatchDependencies) {
  return async function PATCH(request: Request, context: RouteContext) {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError(401, "AUTH_REQUIRED", "Login is required to update alerts.");
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { isRead?: unknown };
    const result = await updateAlert(client as AlertClient, userId, id, body.isRead === true);

    if (!result.updated) {
      return jsonError(404, "ALERT_NOT_FOUND", "Alert was not found for this user.");
    }

    return jsonOk(result);
  };
}
