import { PrismaClient } from "@prisma/client";
import { createConfiguredStripeWebhookPostHandler } from "./configured-route";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  return createConfiguredStripeWebhookPostHandler({
    client: prisma,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  })(request);
}
