import { checkSmartAlerts, type AlertClient } from "@/server/alerts";
import { deliverAlerts, type DeliverableAlert, type DeliverAlertsInput } from "@/server/delivery";
import { jsonError, jsonOk } from "@/server/http";

export type DeliveryUserRecord = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

type DeliveryCronClient = AlertClient & {
  user?: AlertClient["user"] & {
    findMany?: (args: unknown) => Promise<DeliveryUserRecord[]>;
  };
};

type CheckSmartAlerts = typeof checkSmartAlerts;
type DeliverAlerts = (input: DeliverAlertsInput) => ReturnType<typeof deliverAlerts>;

type Dependencies = {
  cronSecret?: string;
  client: DeliveryCronClient | unknown;
  checkSmartAlerts: CheckSmartAlerts;
  deliverAlerts: DeliverAlerts;
  getUsersForDelivery?: typeof getUsersForDelivery;
  now?: () => Date;
};

export function createDeliverAlertsCronHandler({
  cronSecret,
  client,
  checkSmartAlerts: checkAlerts,
  deliverAlerts: deliver,
  getUsersForDelivery: getUsers = getUsersForDelivery,
  now = () => new Date()
}: Dependencies) {
  return async function GET(request: Request) {
    if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return jsonError(401, "CRON_UNAUTHORIZED", "Cron authorization failed.");
    }

    const deliveryClient = client as DeliveryCronClient;
    const users = await getUsers(deliveryClient);
    const deliveries = [];
    let alertsCreated = 0;

    for (const user of users) {
      const result = await checkAlerts(deliveryClient, user.id, now());
      const createdAlerts = result.created.map(toDeliverableAlert);
      alertsCreated += createdAlerts.length;

      const delivery = await deliver({
        user,
        alerts: createdAlerts,
        preferences: result.preferences
      });

      deliveries.push({
        userId: user.id,
        created: createdAlerts.length,
        attempts: delivery.attempts
      });
    }

    return jsonOk({
      usersChecked: users.length,
      alertsCreated,
      deliveries
    });
  };
}

export async function getUsersForDelivery(client: DeliveryCronClient): Promise<DeliveryUserRecord[]> {
  return client.user?.findMany?.({
    where: {
      plan: { in: ["pro", "team"] },
      watchlists: {
        some: {
          alertEnabled: true
        }
      }
    },
    select: {
      id: true,
      email: true,
      displayName: true
    }
  }) ?? [];
}

function toDeliverableAlert(alert: { id: string; message?: unknown; reasonText?: unknown; type?: unknown }): DeliverableAlert {
  return {
    id: alert.id,
    type: typeof alert.type === "string" ? alert.type : undefined,
    message: typeof alert.message === "string" ? alert.message : "ContribRadar alert",
    reasonText: typeof alert.reasonText === "string" ? alert.reasonText : "A watched repository needs attention."
  };
}
