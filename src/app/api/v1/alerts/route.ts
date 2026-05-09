import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { checkSmartAlerts, listAlerts } from "@/server/alerts";
import { createAlertsGetHandler, createAlertsPostHandler } from "./route-handler";

export const GET = createAlertsGetHandler({
  auth,
  client: prisma,
  listAlerts
});

export const POST = createAlertsPostHandler({
  auth,
  client: prisma,
  checkSmartAlerts
});
