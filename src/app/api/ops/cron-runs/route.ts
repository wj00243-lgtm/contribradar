import { prisma } from "@/server/db";
import { listCronRuns } from "@/server/ops-observability";
import { createCronRunsGetHandler } from "./route-handler";

export const GET = createCronRunsGetHandler({
  opsApiKey: process.env.OPS_API_KEY,
  client: prisma,
  listCronRuns
});
