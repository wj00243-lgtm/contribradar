import { describe, expect, it, vi } from "vitest";

import { deliverAlerts, type DeliveryAdapter } from "./delivery";

const alert = {
  id: "alert_1",
  type: "new_issue",
  message: "acme/tooling has a new good first issue",
  reasonText: "This watchlisted repository has an open beginner-friendly issue."
};

const baseInput = {
  user: {
    id: "user_1",
    email: "ada@example.com",
    displayName: "Ada"
  },
  alerts: [alert],
  preferences: {
    email: true,
    slack: true,
    digest: "weekly" as const
  }
};

describe("deliverAlerts", () => {
  it("sends email and Slack only when preferences enable each channel", async () => {
    const emailSend = vi.fn().mockResolvedValue({ status: "sent" });
    const slackSend = vi.fn().mockResolvedValue({ status: "sent" });
    const adapters = {
      email: { channel: "email", send: emailSend } satisfies DeliveryAdapter,
      slack: { channel: "slack", send: slackSend } satisfies DeliveryAdapter
    };

    await expect(deliverAlerts({ ...baseInput, preferences: { ...baseInput.preferences, slack: false } }, adapters)).resolves.toEqual({
      attempts: [
        expect.objectContaining({
          alertId: "alert_1",
          channel: "email",
          status: "sent",
          attempts: 1
        })
      ]
    });
    expect(emailSend).toHaveBeenCalledOnce();
    expect(slackSend).not.toHaveBeenCalled();
  });

  it("retries transient adapter failures and reports the final sent attempt", async () => {
    const emailSend = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary outage"))
      .mockResolvedValueOnce({ status: "sent" });

    const result = await deliverAlerts(
      { ...baseInput, preferences: { ...baseInput.preferences, slack: false } },
      {
        email: { channel: "email", send: emailSend }
      },
      { maxAttempts: 2 }
    );

    expect(result.attempts).toEqual([
      expect.objectContaining({
        channel: "email",
        status: "sent",
        attempts: 2
      })
    ]);
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("returns a failed status after exhausting retries", async () => {
    const emailSend = vi.fn().mockRejectedValue(new Error("resend down"));

    const result = await deliverAlerts(
      { ...baseInput, preferences: { ...baseInput.preferences, slack: false } },
      {
        email: { channel: "email", send: emailSend }
      },
      { maxAttempts: 2 }
    );

    expect(result.attempts).toEqual([
      expect.objectContaining({
        channel: "email",
        status: "failed",
        attempts: 2,
        error: "resend down"
      })
    ]);
  });

  it("returns skipped when there are no alerts to deliver", async () => {
    const emailSend = vi.fn();

    await expect(
      deliverAlerts(
        { ...baseInput, alerts: [] },
        {
          email: { channel: "email", send: emailSend }
        }
      )
    ).resolves.toEqual({ attempts: [] });
    expect(emailSend).not.toHaveBeenCalled();
  });
});
