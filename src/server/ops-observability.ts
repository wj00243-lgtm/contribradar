import type { DeliveryAttempt } from "./delivery";

export type CronRunRecord = {
  id: string;
  startedAt: Date;
};

export type OpsObservabilityClient = {
  cronRun?: {
    create?: (args: unknown) => Promise<CronRunRecord>;
    update?: (args: unknown) => Promise<unknown>;
    findMany?: (args: unknown) => Promise<unknown[]>;
  };
  deliveryAttemptLog?: {
    createMany?: (args: unknown) => Promise<unknown>;
  };
};

type CronRunCompletion = {
  status: "succeeded" | "failed";
  usersChecked: number;
  alertsCreated: number;
  failures: number;
  finishedAt: Date;
  errorSummary?: string;
};

export async function startCronRun(
  client: OpsObservabilityClient,
  name: string,
  startedAt = new Date()
): Promise<CronRunRecord | null> {
  if (!client.cronRun?.create) {
    return null;
  }

  return client.cronRun.create({
    data: {
      name,
      status: "running",
      startedAt
    }
  });
}

export async function completeCronRun(
  client: OpsObservabilityClient,
  run: CronRunRecord | null,
  completion: CronRunCompletion
) {
  if (!run || !client.cronRun?.update) {
    return;
  }

  await client.cronRun.update({
    where: { id: run.id },
    data: {
      status: completion.status,
      usersChecked: completion.usersChecked,
      alertsCreated: completion.alertsCreated,
      failures: completion.failures,
      finishedAt: completion.finishedAt,
      durationMs: Math.max(0, completion.finishedAt.getTime() - run.startedAt.getTime()),
      errorSummary: completion.errorSummary
    }
  });
}

export async function failCronRun(
  client: OpsObservabilityClient,
  run: CronRunRecord | null,
  error: unknown,
  finishedAt = new Date()
) {
  await completeCronRun(client, run, {
    status: "failed",
    usersChecked: 0,
    alertsCreated: 0,
    failures: 1,
    finishedAt,
    errorSummary: error instanceof Error ? error.message : String(error)
  });
}

export async function logDeliveryAttempts(
  client: OpsObservabilityClient,
  input: {
    runId?: string | null;
    userId: string;
    attempts: DeliveryAttempt[];
  }
) {
  if (!input.runId || input.attempts.length === 0 || !client.deliveryAttemptLog?.createMany) {
    return;
  }

  await client.deliveryAttemptLog.createMany({
    data: input.attempts.map((attempt) => ({
      runId: input.runId,
      userId: input.userId,
      alertId: attempt.alertId,
      channel: attempt.channel,
      status: attempt.status,
      attempts: attempt.attempts,
      providerId: attempt.providerId,
      reason: attempt.reason,
      error: attempt.error
    }))
  });
}

export async function listCronRuns(
  client: OpsObservabilityClient,
  options: { limit?: number } = {}
): Promise<unknown[]> {
  if (!client.cronRun?.findMany) {
    return [];
  }

  return client.cronRun.findMany({
    orderBy: { startedAt: "desc" },
    take: Math.min(50, Math.max(1, options.limit ?? 10)),
    include: {
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 50
      }
    }
  });
}
