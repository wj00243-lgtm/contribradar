export function billingAppUrl(...candidates: Array<string | undefined>): string | undefined {
  const candidate = candidates.find((value) => value && value.trim().length > 0)?.trim();
  const normalized = candidate?.replace(/\/+$/, "");

  if (!normalized || !isBillingAppOrigin(normalized)) {
    return undefined;
  }

  return normalized;
}

function isBillingAppOrigin(value: string) {
  try {
    const url = new URL(value);

    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === value;
  } catch {
    return false;
  }
}
