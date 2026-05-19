import { NextResponse } from "next/server";
import type Stripe from "stripe";

type Dependencies = {
  client: any;
  stripe: Stripe;
  webhookSecret?: string;
};

export function createStripeWebhookPostHandler({ client, stripe, webhookSecret }: Dependencies) {
  return async function POST(req: Request) {
    let event: Stripe.Event;

    try {
      const signature = req.headers.get("stripe-signature");

      if (!signature) {
        return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
      }

      if (!webhookSecret) {
        return NextResponse.json({ error: "Stripe webhook secret is not configured" }, { status: 503 });
      }

      const rawBody = await req.text();
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = parseCheckoutSession(event.data.object);

          if (!session) {
            return NextResponse.json({ error: "Invalid checkout session payload" }, { status: 400 });
          }
          
          if (session.mode === "subscription" && session.client_reference_id) {
            const userId = session.client_reference_id;
            const customerId = typeof session.customer === "string" ? session.customer : "";
            const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
            if (!customerId || !subscriptionId) {
              return NextResponse.json({ error: "Invalid checkout session payload" }, { status: 400 });
            }
            
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

            await client.$transaction([
              client.user.update({
                where: { id: userId },
                data: {
                  stripeCustomerId: customerId,
                  plan: "pro"
                }
              }),
              client.subscription.upsert({
                where: { userId },
                create: {
                  userId,
                  stripeSubscriptionId: subscription.id,
                  stripePriceId: subscription.items.data[0]?.price.id ?? "unknown",
                  status: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end
                },
                update: {
                  stripeSubscriptionId: subscription.id,
                  stripePriceId: subscription.items.data[0]?.price.id ?? "unknown",
                  status: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end
                }
              })
            ]);
          }
          break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = parseSubscription(event.data.object);

          if (!subscription) {
            return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
          }
          
          const subRecord = await client.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id }
          });

          if (!subRecord) {
            console.warn(`Webhook received for unknown subscription: ${subscription.id}`);
            break;
          }

          const userId = subRecord.userId;

          await client.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              status: subscription.status,
              stripePriceId: subscription.items.data[0]?.price.id ?? "unknown",
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end
            }
          });

          if (event.type === "customer.subscription.deleted" || subscription.status === "canceled" || subscription.status === "unpaid") {
            const userSettings = await client.userSettings.findUnique({
              where: { userId }
            });

            if (!userSettings?.isLifetimeBeta) {
              await client.user.update({
                where: { id: userId },
                data: { plan: "free" }
              });
            } else {
              await client.user.update({
                where: { id: userId },
                data: { plan: "pro" }
              });
            }
          } else if (subscription.status === "active") {
            await client.user.update({
              where: { id: userId },
              data: { plan: "pro" }
            });
          }
          break;
        }
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }
  };
}

function parseCheckoutSession(value: unknown): Stripe.Checkout.Session | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as Partial<Stripe.Checkout.Session>;

  if (session.mode !== "subscription" && session.mode !== "payment" && session.mode !== undefined) {
    return null;
  }

  return session as Stripe.Checkout.Session;
}

function parseSubscription(value: unknown): {
  id: string;
  status: Stripe.Subscription.Status;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: { data: Array<{ price: { id: string } }> };
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const subscription = value as Partial<Stripe.Subscription> & {
    current_period_end?: unknown;
  };

  if (
    typeof subscription.id !== "string" ||
    subscription.id.trim().length === 0 ||
    typeof subscription.status !== "string" ||
    typeof subscription.current_period_end !== "number" ||
    !Number.isFinite(subscription.current_period_end) ||
    typeof subscription.cancel_at_period_end !== "boolean" ||
    !subscription.items ||
    !Array.isArray(subscription.items.data)
  ) {
    return null;
  }

  return subscription as {
    id: string;
    status: Stripe.Subscription.Status;
    current_period_end: number;
    cancel_at_period_end: boolean;
    items: { data: Array<{ price: { id: string } }> };
  };
}
