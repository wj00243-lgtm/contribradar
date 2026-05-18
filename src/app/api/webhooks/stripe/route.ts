import { getStripe } from "@/server/stripe";
import { PrismaClient } from "@prisma/client";
import { createStripeWebhookPostHandler } from "./route-handler";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  return createStripeWebhookPostHandler({
    client: prisma,
    stripe: getStripe(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  })(request);
}
