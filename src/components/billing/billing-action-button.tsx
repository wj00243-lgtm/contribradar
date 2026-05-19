"use client";

import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type BillingActionButtonProps = {
  endpoint: "/api/v1/checkout" | "/api/v1/billing-portal";
  children: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
};

export async function resolveBillingRedirectUrl(response: Response): Promise<string> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Billing request failed.";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || !("url" in payload) || typeof payload.url !== "string" || payload.url.length === 0) {
    throw new Error("Billing redirect URL was not returned.");
  }

  return payload.url;
}

export function BillingActionButton({ endpoint, children, className, variant, size }: BillingActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      const url = await resolveBillingRedirectUrl(response);
      window.location.assign(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Billing request failed.");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant={variant} size={size} className={className} disabled={isLoading} onClick={handleClick}>
        {isLoading ? "Redirecting..." : children}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
