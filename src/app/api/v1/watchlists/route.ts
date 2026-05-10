import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { createWatchlistInDb } from "@/server/watchlists-db";
import { createWatchlistsPostHandler } from "./route-handler";

export const POST = createWatchlistsPostHandler({
  auth,
  client: prisma,
  createWatchlist: createWatchlistInDb
});
