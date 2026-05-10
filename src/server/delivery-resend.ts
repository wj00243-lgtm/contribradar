import type { DeliveryAdapter, DeliveryPayload } from "./delivery";

type FetchLike = (url: string, init: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

type ResendEmailAdapterOptions = {
  apiKey?: string;
  from?: string;
  timeoutMs?: number;
  fetch?: FetchLike;
};

export function createResendEmailAdapter({
  apiKey,
  from,
  timeoutMs = 10_000,
  fetch: fetchImpl = fetch as FetchLike
}: ResendEmailAdapterOptions): DeliveryAdapter {
  return {
    channel: "email",
    async send(payload: DeliveryPayload) {
      if (!apiKey || !from) {
        return {
          status: "skipped",
          reason: "Resend email delivery is not configured."
        };
      }

      if (!payload.user.email) {
        return {
          status: "skipped",
          reason: "User email is missing."
        };
      }

      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [payload.user.email],
          subject: payload.subject,
          text: payload.text
        })
      });

      if (!response.ok) {
        const body = response.text ? await response.text() : "";
        throw new Error(`Resend email delivery failed with ${response.status}: ${body}`);
      }

      const body = response.json ? await response.json() : {};
      const providerId = body && typeof body === "object" && "id" in body && typeof body.id === "string" ? body.id : undefined;

      return {
        status: "sent",
        providerId
      };
    }
  };
}
