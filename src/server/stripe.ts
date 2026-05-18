import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // In a real production app, this should throw.
  // But for the build process or when billing is optional in early beta, we can initialize it lazily or throw on use.
  // Throwing immediately might break Vercel builds if STRIPE_SECRET_KEY is not set in all environments.
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia", // Use the latest API version or your account's version
      appInfo: {
        name: "ContribRadar",
        version: "1.0.0"
      }
    })
  : null;

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

export function getStripe(): Stripe {
  if (!stripe) {
    throw new StripeConfigurationError("Stripe is not configured. STRIPE_SECRET_KEY is missing.");
  }
  return stripe;
}
