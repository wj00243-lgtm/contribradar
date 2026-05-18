import { auth } from "@/auth";
import { getStripe } from "@/server/stripe";
import { PrismaClient } from "@prisma/client";
import { createBillingPortalPostHandler } from "./route-handler";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  return createBillingPortalPostHandler({
    auth,
    client: prisma,
    stripe: getStripe(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL
  })(request);
}
