import { describe, expect, it, vi } from "vitest";

import { createSlackWebhookAdapter } from "./delivery-slack";

const payload = {
  user: {
    id: "user_1",
    email: "ada@example.com",
    displayName: "Ada"
  },
  alert: {
    id: "alert_1",
    message: "New issue",
    reasonText: "Good first issue"
  },
  subject: "ContribRadar alert",
  text: "New issue\n\nGood first issue"
};

describe("createSlackWebhookAdapter", () => {
  it("posts channel notifications to the configured Slack webhook", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
    const adapter = createSlackWebhookAdapter({
      webhookUrl: "https://hooks.slack.com/services/test",
      fetch
    });

    await expect(adapter.send(payload)).resolves.toEqual({ status: "sent" });
    expect(fetch).toHaveBeenCalledWith("https://hooks.slack.com/services/test", {
      method: "POST",
      signal: expect.any(AbortSignal),
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: "New issue\n\nGood first issue"
      })
    });
  });

  it("skips when the webhook URL is missing", async () => {
    const fetch = vi.fn();
    const adapter = createSlackWebhookAdapter({ webhookUrl: "", fetch });

    await expect(adapter.send(payload)).resolves.toEqual({
      status: "skipped",
      reason: "Slack webhook delivery is not configured."
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws on non-2xx responses so retry logic can handle failures", async () => {
    const adapter = createSlackWebhookAdapter({
      webhookUrl: "https://hooks.slack.com/services/test",
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "server error"
      })
    });

    await expect(adapter.send(payload)).rejects.toThrow("Slack webhook delivery failed with 500: server error");
  });

  it("treats unreadable failure bodies as empty text", async () => {
    const adapter = createSlackWebhookAdapter({
      webhookUrl: "https://hooks.slack.com/services/test",
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => {
          throw new Error("body unavailable");
        }
      })
    });

    await expect(adapter.send(payload)).rejects.toThrow("Slack webhook delivery failed with 502: ");
  });

  it("normalizes network errors to a readable message", async () => {
    const adapter = createSlackWebhookAdapter({
      webhookUrl: "https://hooks.slack.com/services/test",
      fetch: vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    });

    await expect(adapter.send(payload)).rejects.toThrow("Slack webhook delivery failed: network error (Failed to fetch)");
  });

  it("normalizes timeout errors to a readable message", async () => {
    const adapter = createSlackWebhookAdapter({
      webhookUrl: "https://hooks.slack.com/services/test",
      fetch: vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError"))
    });

    await expect(adapter.send(payload)).rejects.toThrow("Slack webhook delivery failed: request timeout");
  });

  it("normalizes generic errors to a readable message", async () => {
    const adapter = createSlackWebhookAdapter({
      webhookUrl: "https://hooks.slack.com/services/test",
      fetch: vi.fn().mockRejectedValue(new Error("Unexpected issue"))
    });

    await expect(adapter.send(payload)).rejects.toThrow("Slack webhook delivery failed: unexpected error (Unexpected issue)");
  });
});
