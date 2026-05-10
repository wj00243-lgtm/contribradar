import { prisma } from "@/server/db";
import { checkSmartAlerts } from "@/server/alerts";
import { deliverAlerts } from "@/server/delivery";
import { createResendEmailAdapter } from "@/server/delivery-resend";
import { createSlackWebhookAdapter } from "@/server/delivery-slack";
import { completeCronRun, failCronRun, logDeliveryAttempts, startCronRun } from "@/server/ops-observability";
import { createDeliverAlertsCronHandler } from "./route-handler";

const email = createResendEmailAdapter({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.RESEND_FROM_EMAIL
});
const slack = createSlackWebhookAdapter({
  webhookUrl: process.env.SLACK_WEBHOOK_URL
});

export const GET = createDeliverAlertsCronHandler({
  cronSecret: process.env.CRON_SECRET,
  client: prisma,
  checkSmartAlerts,
  completeCronRun,
  deliverAlerts: (input) => deliverAlerts(input, { email, slack }),
  failCronRun,
  logDeliveryAttempts,
  startCronRun
});
