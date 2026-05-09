import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { markAlertRead } from "@/server/alerts";
import { createAlertPatchHandler } from "./route-handler";

export const PATCH = createAlertPatchHandler({
  auth,
  client: prisma,
  markAlertRead
});
