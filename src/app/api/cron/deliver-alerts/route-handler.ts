import { checkSmartAlerts, type AlertClient } from "@/server/alerts";
import { deliverAlerts, type DeliverableAlert, type DeliverAlertsInput } from "@/server/delivery";
import { jsonError, jsonOk } from "@/server/http";
import { logger as defaultLogger, type Logger } from "@/server/logger";
import {
  completeCronRun,
  failCronRun,
  logDeliveryAttempts,
  startCronRun,
  type OpsObservabilityClient
} from "@/server/ops-observability";

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
  completeCronRun?: typeof completeCronRun;
  deliverAlerts: DeliverAlerts;
  failCronRun?: typeof failCronRun;
  getUsersForDelivery?: typeof getUsersForDelivery;
  logDeliveryAttempts?: typeof logDeliveryAttempts;
  logger?: Logger;
  now?: () => Date;
  startCronRun?: typeof startCronRun;
};

export function createDeliverAlertsCronHandler({
  cronSecret,
  client,
  checkSmartAlerts: checkAlerts,
  completeCronRun: completeRun = completeCronRun,
  deliverAlerts: deliver,
  failCronRun: failRun = failCronRun,
  getUsersForDelivery: getUsers = getUsersForDelivery,
  logDeliveryAttempts: logAttempts = logDeliveryAttempts,
  logger = defaultLogger,
  now = () => new Date(),
  startCronRun: startRun = startCronRun
}: Dependencies) {
  return async function GET(request: Request) {
    if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return jsonError(401, "CRON_UNAUTHORIZED", "Cron authorization failed.");
    }

    const deliveryClient = client as DeliveryCronClient;
    const run = await startRun(deliveryClient as OpsObservabilityClient, "deliver-alerts", now());
    let users: DeliveryUserRecord[];

    try {
      users = await getUsers(deliveryClient);
    } catch (error) {
      await failRun(deliveryClient as OpsObservabilityClient, run, error, now());
      throw error;
    }

    const deliveries = [];
    let alertsCreated = 0;
    let failures = 0;

    for (const user of users) {
      try {
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
        await logAttempts(deliveryClient as OpsObservabilityClient, {
          runId: run?.id,
          userId: user.id,
          attempts: delivery.attempts
        });
      } catch (error) {
        failures += 1;
        logger.error("cron.deliver_alerts.user_failed", error, {
          route: "/api/cron/deliver-alerts",
          userId: user.id
        });
        deliveries.push({
          userId: user.id,
          created: 0,
          attempts: [],
          error: error instanceof Error ? error.message : "Delivery failed."
        });
      }
    }

    await completeRun(deliveryClient as OpsObservabilityClient, run, {
      status: "succeeded",
      usersChecked: users.length,
      alertsCreated,
      failures,
      finishedAt: now()
    });

    return jsonOk({
      usersChecked: users.length,
      alertsCreated,
      failures,
      runId: run?.id ?? null,
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
