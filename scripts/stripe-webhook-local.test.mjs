import { describe, expect, it } from "vitest";

import {
  buildCheckoutTriggerArgs,
  parseArgs,
  stripeEnvStatus
} from "./stripe-webhook-local.mjs";

describe("stripe-webhook-local", () => {
  it("parses trigger-checkout with user override", () => {
    expect(parseArgs(["trigger-checkout", "--user=abc"])).toEqual({
      command: "trigger-checkout",
      user: "abc",
      sub: ""
    });
  });

  it("defaults guide command and user_demo", () => {
    expect(parseArgs([])).toEqual({
      command: "guide",
      user: "user_demo",
      sub: ""
    });
  });

  it("reports missing stripe env keys", () => {
    expect(stripeEnvStatus({ STRIPE_SECRET_KEY: "sk_test" })).toEqual({
      ok: false,
      missing: ["STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"]
    });
  });

  it("builds checkout trigger overrides for client_reference_id", () => {
    expect(buildCheckoutTriggerArgs("user_demo")).toEqual([
      "trigger",
      "checkout.session.completed",
      "--override",
      "checkout_session:client_reference_id=user_demo",
      "--override",
      "checkout_session:mode=subscription"
    ]);
  });
});
