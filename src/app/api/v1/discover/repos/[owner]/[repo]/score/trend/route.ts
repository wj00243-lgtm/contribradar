import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getRepositoryScoreTrend } from "@/server/score-trends";
import { createScoreTrendGetHandler } from "./route-handler";

export const GET = createScoreTrendGetHandler({
  auth,
  client: prisma,
  getScoreTrend: getRepositoryScoreTrend
});
