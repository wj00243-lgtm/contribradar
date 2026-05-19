import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { createConfiguredBillingPortalPostHandler } from "./configured-route";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  return createConfiguredBillingPortalPostHandler({ auth, client: prisma })(request);
}
