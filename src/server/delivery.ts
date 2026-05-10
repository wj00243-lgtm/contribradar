import type { AlertPreferences } from "./alert-preferences";

export type DeliveryChannel = "email" | "slack";
export type DeliveryStatus = "sent" | "skipped" | "failed";

export type DeliverableAlert = {
  id: string;
  type?: string;
  message: string;
  reasonText: string;
};

export type DeliveryUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

export type DeliveryPayload = {
  user: DeliveryUser;
  alert: DeliverableAlert;
  subject: string;
  text: string;
};

export type DeliveryAdapterResult = {
  status: Exclude<DeliveryStatus, "failed">;
  providerId?: string;
  reason?: string;
};

export type DeliveryAdapter = {
  channel: DeliveryChannel;
  send: (payload: DeliveryPayload) => Promise<DeliveryAdapterResult>;
};

export type DeliveryAttempt = {
  alertId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  providerId?: string;
  reason?: string;
  error?: string;
};

export type DeliverAlertsInput = {
  user: DeliveryUser;
  alerts: DeliverableAlert[];
  preferences: AlertPreferences;
};

export type DeliveryOptions = {
  maxAttempts?: number;
};

export async function deliverAlerts(
  input: DeliverAlertsInput,
  adapters: Partial<Record<DeliveryChannel, DeliveryAdapter>>,
  options: DeliveryOptions = {}
): Promise<{ attempts: DeliveryAttempt[] }> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const channels = enabledChannels(input.preferences);
  const attempts: DeliveryAttempt[] = [];

  for (const alert of input.alerts) {
    const payload = buildPayload(input.user, alert);

    for (const channel of channels) {
      const adapter = adapters[channel];

      if (!adapter) {
        attempts.push({
          alertId: alert.id,
          channel,
          status: "skipped",
          attempts: 0,
          reason: "Delivery adapter is not configured."
        });
        continue;
      }

      attempts.push(await sendWithRetry(adapter, payload, maxAttempts));
    }
  }

  return { attempts };
}

function enabledChannels(preferences: AlertPreferences): DeliveryChannel[] {
  return [
    ...(preferences.email ? (["email"] as const) : []),
    ...(preferences.slack ? (["slack"] as const) : [])
  ];
}

function buildPayload(user: DeliveryUser, alert: DeliverableAlert): DeliveryPayload {
  return {
    user,
    alert,
    subject: `ContribRadar alert: ${alert.message}`,
    text: `${alert.message}\n\n${alert.reasonText}`
  };
}

async function sendWithRetry(
  adapter: DeliveryAdapter,
  payload: DeliveryPayload,
  maxAttempts: number
): Promise<DeliveryAttempt> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await adapter.send(payload);

      return {
        alertId: payload.alert.id,
        channel: adapter.channel,
        status: result.status,
        attempts: attempt,
        providerId: result.providerId,
        reason: result.reason
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    alertId: payload.alert.id,
    channel: adapter.channel,
    status: "failed",
    attempts: maxAttempts,
    error: lastError instanceof Error ? lastError.message : "Delivery failed."
  };
}
