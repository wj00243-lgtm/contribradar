export type AlertDigestFrequency = "daily" | "weekly";

export type AlertPreferences = {
  email: boolean;
  slack: boolean;
  digest: AlertDigestFrequency;
};

const defaultPreferences: AlertPreferences = {
  email: false,
  slack: false,
  digest: "weekly"
};

export function normalizeAlertPreferences(value: unknown): AlertPreferences {
  if (!value || typeof value !== "object") {
    return defaultPreferences;
  }

  const preferences = value as Record<string, unknown>;
  const digest = preferences.digest === "daily" || preferences.digest === "weekly" ? preferences.digest : "weekly";

  return {
    email: preferences.email === true,
    slack: preferences.slack === true,
    digest
  };
}
