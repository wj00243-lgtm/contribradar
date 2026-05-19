import { describe, expect, it, vi } from "vitest";

import { createResendEmailAdapter } from "./delivery-resend";

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

describe("createResendEmailAdapter", () => {
  it("posts transactional email payloads to Resend", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_123" })
    });
    const adapter = createResendEmailAdapter({
      apiKey: "resend_key",
      from: "ContribRadar <alerts@example.com>",
      fetch
    });

    await expect(adapter.send(payload)).resolves.toEqual({ status: "sent", providerId: "email_123" });
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      signal: expect.any(AbortSignal),
      headers: {
        Authorization: "Bearer resend_key",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "ContribRadar <alerts@example.com>",
        to: ["ada@example.com"],
        subject: "ContribRadar alert",
        text: "New issue\n\nGood first issue"
      })
    });
  });

  it("skips when delivery configuration or recipient email is missing", async () => {
    const fetch = vi.fn();
    const adapter = createResendEmailAdapter({ apiKey: "", from: "", fetch });

    await expect(adapter.send(payload)).resolves.toEqual({
      status: "skipped",
      reason: "Resend email delivery is not configured."
    });
    expect(fetch).not.toHaveBeenCalled();

    const configured = createResendEmailAdapter({ apiKey: "resend_key", from: "alerts@example.com", fetch });
    await expect(configured.send({ ...payload, user: { id: "user_1", email: null } })).resolves.toEqual({
      status: "skipped",
      reason: "User email is missing."
    });
  });

  it("throws on non-2xx responses so retry logic can handle failures", async () => {
    const adapter = createResendEmailAdapter({
      apiKey: "resend_key",
      from: "alerts@example.com",
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limited"
      })
    });

    await expect(adapter.send(payload)).rejects.toThrow("Resend email delivery failed with 429: rate limited");
  });

  it("normalizes network errors to a readable message", async () => {
    const adapter = createResendEmailAdapter({
      apiKey: "resend_key",
      from: "alerts@example.com",
      fetch: vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    });

    await expect(adapter.send(payload)).rejects.toThrow("Resend email delivery failed: network error (Failed to fetch)");
  });

  it("normalizes timeout errors to a readable message", async () => {
    const adapter = createResendEmailAdapter({
      apiKey: "resend_key",
      from: "alerts@example.com",
      fetch: vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError"))
    });

    await expect(adapter.send(payload)).rejects.toThrow("Resend email delivery failed: request timeout");
  });

  it("normalizes generic errors to a readable message", async () => {
    const adapter = createResendEmailAdapter({
      apiKey: "resend_key",
      from: "alerts@example.com",
      fetch: vi.fn().mockRejectedValue(new Error("Unexpected issue"))
    });

    await expect(adapter.send(payload)).rejects.toThrow("Resend email delivery failed: unexpected error (Unexpected issue)");
  });
});
