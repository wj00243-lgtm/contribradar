import { describe, expect, it, vi } from "vitest";
import { StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import { createConfiguredStripeWebhookPostHandler } from "./configured-route";
import { createStripeWebhookPostHandler } from "./route-handler";
import type Stripe from "stripe";

function request(body: string, signature?: string) {
  const req = new Request("http://localhost/api/webhooks/stripe", { 
    method: "POST",
    body 
  });
  if (signature) {
    req.headers.set("stripe-signature", signature);
  }
  return req;
}

describe("POST /api/webhooks/stripe", () => {
  it("returns 503 when Stripe is not configured in the route wiring", async () => {
    const POST = createConfiguredStripeWebhookPostHandler({
      client: {} as PrismaClient,
      stripeFactory: () => {
        throw new StripeConfigurationError("Stripe is not configured.");
      },
      webhookSecret: "secret"
    });

    const response = await POST(request("body", "sig_123"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Stripe is not configured" });
  });

  it("returns 400 when missing signature", async () => {
    const POST = createStripeWebhookPostHandler({
      client: {},
      stripe: {} as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("body"));
    expect(response.status).toBe(400);
  });

  it("returns 503 when webhook secret is missing", async () => {
    const POST = createStripeWebhookPostHandler({
      client: {},
      stripe: {} as Stripe,
      webhookSecret: undefined
    });

    const response = await POST(request("body", "sig_123"));
    expect(response.status).toBe(503);
  });

  it("returns 400 on signature verification failure", async () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => { throw new Error("bad sig"); })
      }
    };

    const POST = createStripeWebhookPostHandler({
      client: {},
      stripe: mockStripe as unknown as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("body", "bad_sig"));
    expect(response.status).toBe(400);
  });

  it("processes checkout.session.completed and upgrades user", async () => {
    const mockEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: "user_1",
          customer: "cus_123",
          subscription: "sub_123"
        }
      }
    };

    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(mockEvent)
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "sub_123",
          status: "active",
          current_period_end: 1600000000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_123" } }] }
        })
      }
    };

    const mockClient = {
      $transaction: vi.fn().mockResolvedValue([]),
      user: { update: vi.fn() },
      subscription: { upsert: vi.fn() }
    };

    const POST = createStripeWebhookPostHandler({
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("{}", "valid_sig"));
    
    expect(response.status).toBe(200);
    expect(mockClient.$transaction).toHaveBeenCalledOnce();
  });

  it("returns 500 when the retrieved Stripe subscription is malformed", async () => {
    const mockEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          client_reference_id: "user_1",
          customer: "cus_123",
          subscription: "sub_123"
        }
      }
    };

    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(mockEvent)
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: "",
          status: "active",
          current_period_end: 1600000000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_123" } }] }
        })
      }
    };

    const mockClient = {
      $transaction: vi.fn(),
      user: { update: vi.fn() },
      subscription: { upsert: vi.fn() }
    };

    const POST = createStripeWebhookPostHandler({
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("{}", "valid_sig"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook handler failed" });
    expect(mockClient.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when a subscription event payload is malformed", async () => {
    const mockEvent = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "",
          status: "active",
          current_period_end: "not-a-number",
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_123" } }] }
        }
      }
    };

    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(mockEvent)
      }
    };

    const POST = createStripeWebhookPostHandler({
      client: {
        subscription: {
          findUnique: vi.fn(),
          update: vi.fn()
        },
        userSettings: {
          findUnique: vi.fn()
        },
        user: {
          update: vi.fn()
        }
      },
      stripe: mockStripe as unknown as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("{}", "valid_sig"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid subscription payload" });
  });

  it("downgrades user to free when subscription is deleted and they are not lifetime beta", async () => {
    const mockEvent = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          status: "canceled",
          current_period_end: 1600000000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_123" } }] }
        }
      }
    };

    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(mockEvent)
      }
    };

    const mockClient = {
      subscription: {
        findUnique: vi.fn().mockResolvedValue({ userId: "user_1" }),
        update: vi.fn().mockResolvedValue({})
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ isLifetimeBeta: false })
      },
      user: {
        update: vi.fn().mockResolvedValue({})
      }
    };

    const POST = createStripeWebhookPostHandler({
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("{}", "valid_sig"));
    
    expect(response.status).toBe(200);
    expect(mockClient.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { plan: "free" }
    });
  });

  it("keeps user as pro when subscription is deleted but they are lifetime beta", async () => {
    const mockEvent = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          status: "canceled",
          current_period_end: 1600000000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_123" } }] }
        }
      }
    };

    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(mockEvent)
      }
    };

    const mockClient = {
      subscription: {
        findUnique: vi.fn().mockResolvedValue({ userId: "user_1" }),
        update: vi.fn().mockResolvedValue({})
      },
      userSettings: {
        findUnique: vi.fn().mockResolvedValue({ isLifetimeBeta: true })
      },
      user: {
        update: vi.fn().mockResolvedValue({})
      }
    };

    const POST = createStripeWebhookPostHandler({
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      webhookSecret: "secret"
    });

    const response = await POST(request("{}", "valid_sig"));
    
    expect(response.status).toBe(200);
    expect(mockClient.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { plan: "pro" }
    });
  });
});
