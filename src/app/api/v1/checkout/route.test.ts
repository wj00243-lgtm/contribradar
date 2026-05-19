import { describe, expect, it, vi } from "vitest";
import { StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import { createConfiguredCheckoutPostHandler } from "./configured-route";
import { createCheckoutPostHandler } from "./route-handler";
import type Stripe from "stripe";

function request() {
  return new Request("http://localhost/api/v1/checkout", { method: "POST" });
}

describe("POST /api/v1/checkout", () => {
  it("returns 503 when Stripe is not configured in the route wiring", async () => {
    const POST = createConfiguredCheckoutPostHandler({
      client: {} as PrismaClient,
      stripeFactory: () => {
        throw new StripeConfigurationError("Stripe is not configured.");
      }
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Stripe is not configured" });
  });

  it("returns 401 when no session is present", async () => {
    const POST = createCheckoutPostHandler({
      auth: vi.fn().mockResolvedValue(null),
      client: {},
      stripe: {} as Stripe,
      priceId: "price_123"
    });

    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("returns 503 when STRIPE_PRICE_ID is not configured", async () => {
    const POST = createCheckoutPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: {},
      stripe: {} as Stripe,
      priceId: undefined
    });

    const response = await POST(request());
    expect(response.status).toBe(503);
  });

  it("returns 200 and a session URL for a valid user with a stripe customer id", async () => {
    const mockStripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/123" })
        }
      }
    };

    const mockClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_123", email: "test@example.com" })
      }
    };

    const POST = createCheckoutPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      priceId: "price_123",
      appUrl: "http://localhost:3000"
    });

    const response = await POST(request());
    
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://checkout.stripe.com/123" });
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "subscription",
      customer: "cus_123",
      customer_email: undefined,
      client_reference_id: "user_1",
      line_items: [{ price: "price_123", quantity: 1 }],
      success_url: "http://localhost:3000/?success=true",
      cancel_url: "http://localhost:3000/pricing?canceled=true",
    });
  });

  it("returns 200 and passes customer_email when stripe customer id is missing", async () => {
    const mockStripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/123" })
        }
      }
    };

    const mockClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: null, email: "test@example.com" })
      }
    };

    const POST = createCheckoutPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      priceId: "price_123",
      appUrl: "http://localhost:3000"
    });

    const response = await POST(request());
    
    expect(response.status).toBe(200);
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: undefined,
      customer_email: "test@example.com",
    }));
  });
});
