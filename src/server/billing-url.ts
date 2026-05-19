export function billingAppUrl(...candidates: Array<string | undefined>): string | undefined {
  const candidate = candidates.find((value) => value && value.trim().length > 0)?.trim();

  return candidate?.replace(/\/+$/, "");
}
