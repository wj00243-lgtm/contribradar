import type { DeliveryAdapter, DeliveryPayload } from "./delivery";

type FetchLike = (url: string, init: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  text?: () => Promise<string>;
}>;

type SlackWebhookAdapterOptions = {
  webhookUrl?: string;
  fetch?: FetchLike;
};

export function createSlackWebhookAdapter({
  webhookUrl,
  fetch: fetchImpl = fetch as FetchLike
}: SlackWebhookAdapterOptions): DeliveryAdapter {
  return {
    channel: "slack",
    async send(payload: DeliveryPayload) {
      if (!webhookUrl) {
        return {
          status: "skipped",
          reason: "Slack webhook delivery is not configured."
        };
      }

      const response = await fetchImpl(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: payload.text
        })
      });

      if (!response.ok) {
        const body = response.text ? await response.text() : "";
        throw new Error(`Slack webhook delivery failed with ${response.status}: ${body}`);
      }

      return {
        status: "sent"
      };
    }
  };
}
