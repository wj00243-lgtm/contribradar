import { getStripe, StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { createBillingPortalPostHandler } from "./route-handler";

type StripeFactory = typeof getStripe;
type AuthFactory = () => Promise<Session | null>;

export function createConfiguredBillingPortalPostHandler({
  auth,
  client,
  stripeFactory = getStripe
}: {
  auth: AuthFactory;
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
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL
    })(request);
  };
}
