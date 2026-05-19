import { describe, expect, it, vi } from "vitest";
import { StripeConfigurationError } from "@/server/stripe";
import type { PrismaClient } from "@prisma/client";
import { createConfiguredBillingPortalPostHandler } from "./configured-route";
import { createBillingPortalPostHandler } from "./route-handler";
import type Stripe from "stripe";

function request() {
  return new Request("http://localhost/api/v1/billing-portal", { method: "POST" });
}

describe("POST /api/v1/billing-portal", () => {
  it("uses AUTH_URL for the Stripe portal return URL when NEXT_PUBLIC_APP_URL is not configured", async () => {
    const previousAuthUrl = process.env.AUTH_URL;
    const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.AUTH_URL = "https://contribradar.vercel.app";
    delete process.env.NEXT_PUBLIC_APP_URL;

    const mockStripe = {
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/123" })
        }
      }
    };

    const mockClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_123" })
      }
    };

    try {
      const POST = createConfiguredBillingPortalPostHandler({
        auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
        client: mockClient as unknown as PrismaClient,
        stripeFactory: () => mockStripe as unknown as Stripe
      });

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://contribradar.vercel.app/"
      });
    } finally {
      if (previousAuthUrl === undefined) {
        delete process.env.AUTH_URL;
      } else {
        process.env.AUTH_URL = previousAuthUrl;
      }

      if (previousPublicAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previousPublicAppUrl;
      }
    }
  });

  it("normalizes trailing slashes from the Stripe portal return URL origin", async () => {
    const previousAuthUrl = process.env.AUTH_URL;
    const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.AUTH_URL = "https://contribradar.vercel.app/";
    delete process.env.NEXT_PUBLIC_APP_URL;

    const mockStripe = {
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/123" })
        }
      }
    };

    const mockClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_123" })
      }
    };

    try {
      const POST = createConfiguredBillingPortalPostHandler({
        auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
        client: mockClient as unknown as PrismaClient,
        stripeFactory: () => mockStripe as unknown as Stripe
      });

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://contribradar.vercel.app/"
      });
    } finally {
      if (previousAuthUrl === undefined) {
        delete process.env.AUTH_URL;
      } else {
        process.env.AUTH_URL = previousAuthUrl;
      }

      if (previousPublicAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previousPublicAppUrl;
      }
    }
  });

  it("returns 503 when Stripe is not configured in the route wiring", async () => {
    const POST = createConfiguredBillingPortalPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
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
    const POST = createBillingPortalPostHandler({
      auth: vi.fn().mockResolvedValue(null),
      client: {},
      stripe: {} as Stripe
    });

    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("returns 404 when user has no stripe customer id", async () => {
    const mockClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: null })
      }
    };

    const POST = createBillingPortalPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: mockClient,
      stripe: {} as Stripe
    });

    const response = await POST(request());
    expect(response.status).toBe(404);
  });

  it("returns 200 and a portal URL for a valid user with a stripe customer id", async () => {
    const mockStripe = {
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/123" })
        }
      }
    };

    const mockClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_123" })
      }
    };

    const POST = createBillingPortalPostHandler({
      auth: vi.fn().mockResolvedValue({ user: { id: "user_1" } }),
      client: mockClient,
      stripe: mockStripe as unknown as Stripe,
      appUrl: "http://localhost:3000"
    });

    const response = await POST(request());
    
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://billing.stripe.com/123" });
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/",
    });
  });
});
