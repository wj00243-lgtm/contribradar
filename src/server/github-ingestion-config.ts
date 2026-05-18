export function parseGitHubIngestionRepos(value?: string | string[] | null): string[] {
  const rawValues = Array.isArray(value) ? value : [value ?? ""];

  return [
    ...new Set(
      rawValues
        .flatMap((item) => item.split(/[\n,]/))
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}
