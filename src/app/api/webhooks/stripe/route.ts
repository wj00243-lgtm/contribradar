import { getStripe } from "@/server/stripe";
import { PrismaClient } from "@prisma/client";
import { createStripeWebhookPostHandler } from "./route-handler";

const prisma = new PrismaClient();

export const POST = createStripeWebhookPostHandler({
  client: prisma,
  stripe: getStripe(),
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
});
