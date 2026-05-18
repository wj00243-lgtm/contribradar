export type GitHubIngestionRepositoryResult = {
  repository: string;
  status: "succeeded" | "failed" | string;
  issuesUpserted?: number;
  readinessScore?: number;
  error?: {
    code: string;
    message: string;
  };
};

export type GitHubIngestionResponse = {
  repositories: GitHubIngestionRepositoryResult[];
  totals: {
    requested: number;
    succeeded: number;
    failed: number;
    issuesUpserted: number;
  };
};

export function parseRepositoryInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}

export function formatIngestionSummary(result: GitHubIngestionResponse | null): string {
  if (!result) {
    return "No ingestion run yet.";
  }

  return `${result.totals.succeeded}/${result.totals.requested} repositories ingested, ${result.totals.issuesUpserted} issues upserted.`;
}

export function getIngestionStatusLabel(status: string): string {
  switch (status) {
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    default:
      return status || "Unknown";
  }
}
