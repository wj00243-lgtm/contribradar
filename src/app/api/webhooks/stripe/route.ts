import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getStripe } from "@/server/stripe";
import Stripe from "stripe";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Checkout tamamlandığında
        if (session.mode === "subscription" && session.client_reference_id) {
          const userId = session.client_reference_id;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await prisma.$transaction([
            prisma.user.update({
              where: { id: userId },
              data: {
                stripeCustomerId: customerId,
                plan: "pro" // Checkout başarılıysa erişimi pro yapıyoruz
              }
            }),
            prisma.subscription.upsert({
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
        const subscription = event.data.object as Stripe.Subscription;
        
        const subRecord = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id }
        });

        if (!subRecord) {
          console.warn(`Webhook received for unknown subscription: ${subscription.id}`);
          break;
        }

        const userId = subRecord.userId;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0]?.price.id ?? "unknown",
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        });

        // Eğer abonelik iptal edildiyse, kullanıcının Grandfather durumunu kontrol et
        if (event.type === "customer.subscription.deleted" || subscription.status === "canceled" || subscription.status === "unpaid") {
          const userSettings = await prisma.userSettings.findUnique({
            where: { userId }
          });

          // Kullanıcı lifetime beta değilse, planı free'ye düşür.
          if (!userSettings?.isLifetimeBeta) {
            await prisma.user.update({
              where: { id: userId },
              data: { plan: "free" }
            });
          } else {
            // Lifetime beta ise planını koru (pro kalsın)
            await prisma.user.update({
              where: { id: userId },
              data: { plan: "pro" }
            });
          }
        } else if (subscription.status === "active") {
          // Aktifse ve bir şekilde düşürüldüyse tekrar yükselt
          await prisma.user.update({
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
}
