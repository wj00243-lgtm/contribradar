import { auth } from "@/auth";
import { getStripe } from "@/server/stripe";
import { PrismaClient } from "@prisma/client";
import { createCheckoutPostHandler } from "./route-handler";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  return createCheckoutPostHandler({
    auth,
    client: prisma,
    stripe: getStripe(),
    priceId: process.env.STRIPE_PRICE_ID,
    appUrl: process.env.NEXT_PUBLIC_APP_URL
  })(request);
}
