import { prisma } from "@/server/db";
import { discoverIssuesFromDb } from "@/server/discovery-db";
import { createIssuesGetHandler } from "./route-handler";

export const GET = createIssuesGetHandler({
  client: prisma,
  discoverIssues: discoverIssuesFromDb
});
