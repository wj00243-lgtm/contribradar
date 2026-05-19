import { describe, expect, it } from "vitest";
import { resolveBillingRedirectUrl } from "./billing-action-button";

describe("resolveBillingRedirectUrl", () => {
  it("returns the Stripe redirect URL from a successful billing response", async () => {
    const response = Response.json({ url: "https://checkout.stripe.com/session" });

    await expect(resolveBillingRedirectUrl(response)).resolves.toBe("https://checkout.stripe.com/session");
  });

  it("surfaces API errors from failed billing responses", async () => {
    const response = Response.json({ error: "Stripe is not configured" }, { status: 503 });

    await expect(resolveBillingRedirectUrl(response)).rejects.toThrow("Stripe is not configured");
  });

  it("rejects successful responses without a redirect URL", async () => {
    const response = Response.json({ ok: true });

    await expect(resolveBillingRedirectUrl(response)).rejects.toThrow("Billing redirect URL was not returned.");
  });
});
