import { auth } from "@/auth";
import { getStripe, StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { createBillingPortalPostHandler } from "./route-handler";

type StripeFactory = typeof getStripe;

export function createConfiguredBillingPortalPostHandler({
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

    return createBillingPortalPostHandler({
      auth,
      client,
      stripe,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    })(request);
  };
}
