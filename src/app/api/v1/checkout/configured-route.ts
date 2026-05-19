import { auth } from "@/auth";
import { getStripe, StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { createCheckoutPostHandler } from "./route-handler";

type StripeFactory = typeof getStripe;

export function createConfiguredCheckoutPostHandler({
  client,
  stripeFactory = getStripe
}: {
  client: PrismaClient;
  stripeFactory?: StripeFactory;
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

    return createCheckoutPostHandler({
      auth,
      client,
      stripe,
      priceId: process.env.STRIPE_PRICE_ID,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    })(request);
  };
}
