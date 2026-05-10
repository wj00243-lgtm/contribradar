import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getWatchlistReposFromDb } from "@/server/watchlists-db";
import { createWatchlistReposGetHandler } from "./route-handler";

export const GET = createWatchlistReposGetHandler({
  auth,
  client: prisma,
  getWatchlistRepos: getWatchlistReposFromDb
});
