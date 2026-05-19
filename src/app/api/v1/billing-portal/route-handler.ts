import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type Stripe from "stripe";

type Dependencies = {
  auth: () => Promise<Session | null>;
  client: any;
  stripe: Stripe;
  appUrl?: string;
};

export function createBillingPortalPostHandler({ auth, client, stripe, appUrl }: Dependencies) {
  return async function POST(request: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!appUrl) {
        return NextResponse.json({ error: "APP_URL is not configured" }, { status: 503 });
      }

      const dbUser = await client.user.findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true }
      });

      if (!dbUser?.stripeCustomerId) {
        return NextResponse.json({ error: "No billing record found" }, { status: 404 });
      }
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: `${appUrl}/`,
      });

      return NextResponse.json({ url: portalSession.url });
    } catch (error) {
      console.error("Stripe Portal Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
