import { getStripe, StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { createStripeWebhookPostHandler } from "./route-handler";

type StripeFactory = typeof getStripe;

export function createConfiguredStripeWebhookPostHandler({
  client,
  stripeFactory = getStripe,
  webhookSecret
}: {
  client: PrismaClient;
  stripeFactory?: StripeFactory;
  webhookSecret?: string;
}) {
  return async function POST(request: Request) {
    let stripe;

    try {
      stripe = stripeFactory();
    } catch (error) {
      if (error instanceof StripeConfigurationError) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
      }
      throw error;
    }

    return createStripeWebhookPostHandler({
      client,
      stripe,
      webhookSecret
    })(request);
  };
}
