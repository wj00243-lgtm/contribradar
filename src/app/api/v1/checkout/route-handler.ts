import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type Stripe from "stripe";

type Dependencies = {
  auth: () => Promise<Session | null>;
  client: any; // Using any for PrismaClient mockability in tests without deep typing here
  stripe: Stripe;
  priceId?: string;
  appUrl?: string;
};

export function createCheckoutPostHandler({ auth, client, stripe, priceId, appUrl }: Dependencies) {
  return async function POST(request: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!priceId) {
        return NextResponse.json({ error: "STRIPE_PRICE_ID is not configured" }, { status: 503 });
      }

      if (!appUrl) {
        return NextResponse.json({ error: "APP_URL is not configured" }, { status: 503 });
      }

      const dbUser = await client.user.findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true, email: true }
      });

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: dbUser?.stripeCustomerId ?? undefined,
        customer_email: dbUser?.stripeCustomerId ? undefined : (dbUser?.email ?? undefined),
        client_reference_id: session.user.id,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/?success=true`,
        cancel_url: `${appUrl}/pricing?canceled=true`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
      console.error("Stripe Checkout Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
