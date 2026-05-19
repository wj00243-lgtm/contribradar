import type { BadgeProps } from "@/components/ui/badge";

export type DeliveryAttemptView = {
  id?: string;
  alertId?: string | null;
  channel: "email" | "slack" | string;
  status: "sent" | "failed" | "skipped" | string;
  attempts: number;
  providerId?: string | null;
  reason?: string | null;
  error?: string | null;
  createdAt?: string | Date;
};

export type CronRunView = {
  id: string;
  name: string;
  status: "running" | "succeeded" | "failed" | string;
  usersChecked: number;
  alertsCreated: number;
  failures: number;
  startedAt: string | Date;
  finishedAt?: string | Date | null;
  durationMs?: number | null;
  errorSummary?: string | null;
  attempts?: DeliveryAttemptView[];
};

export type CronRunSummary = {
  totalRuns: number;
  succeeded: number;
  failed: number;
  running: number;
  deliveryAttempts: number;
  deliveryFailures: number;
};

export function getRunStatusLabel(status: string) {
  switch (status) {
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    default:
      return status || "Unknown";
  }
}

export function getRunStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "failed") {
    return "destructive";
  }

  if (status === "succeeded") {
    return "default";
  }

  return "secondary";
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "Not finished";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC"
  }).format(date);
}

export function formatDuration(durationMs?: number | null) {
  if (durationMs === undefined || durationMs === null) {
    return "In progress";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function summarizeCronRuns(runs: CronRunView[]): CronRunSummary {
  return runs.reduce<CronRunSummary>(
    (summary, run) => {
      const attempts = run.attempts ?? [];

      summary.totalRuns += 1;
      summary.deliveryAttempts += attempts.length;
      summary.deliveryFailures += attempts.filter((attempt) => attempt.status === "failed").length;

      if (run.status === "succeeded") {
        summary.succeeded += 1;
      } else if (run.status === "failed") {
        summary.failed += 1;
      } else if (run.status === "running") {
        summary.running += 1;
      }

      return summary;
    },
    {
      totalRuns: 0,
      succeeded: 0,
      failed: 0,
      running: 0,
      deliveryAttempts: 0,
      deliveryFailures: 0
    }
  );
}

export function filterFailedAttempts(attempts: DeliveryAttemptView[]): DeliveryAttemptView[] {
  return attempts.filter((attempt) => attempt.status === "failed");
}

export type AttemptCategories = {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
};

export function categorizeAttempts(attempts: DeliveryAttemptView[]): AttemptCategories {
  return attempts.reduce<AttemptCategories>(
    (acc, attempt) => {
      acc.total += 1;

      if (attempt.status === "sent") {
        acc.sent += 1;
      } else if (attempt.status === "failed") {
        acc.failed += 1;
      } else if (attempt.status === "skipped") {
        acc.skipped += 1;
      }

      return acc;
    },
    {
      sent: 0,
      failed: 0,
      skipped: 0,
      total: 0
    }
  );
}
