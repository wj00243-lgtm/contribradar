CREATE TYPE "CronRunStatus" AS ENUM ('running', 'succeeded', 'failed');
CREATE TYPE "DeliveryChannel" AS ENUM ('email', 'slack');
CREATE TYPE "DeliveryStatus" AS ENUM ('sent', 'skipped', 'failed');

CREATE TABLE "cron_runs" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CronRunStatus" NOT NULL DEFAULT 'running',
  "usersChecked" INTEGER NOT NULL DEFAULT 0,
  "alertsCreated" INTEGER NOT NULL DEFAULT 0,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "errorSummary" TEXT,
  CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_attempt_logs" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "userId" TEXT,
  "alertId" TEXT,
  "channel" "DeliveryChannel" NOT NULL,
  "status" "DeliveryStatus" NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerId" TEXT,
  "reason" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_attempt_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cron_runs_name_startedAt_idx" ON "cron_runs"("name", "startedAt" DESC);
CREATE INDEX "cron_runs_status_startedAt_idx" ON "cron_runs"("status", "startedAt" DESC);
CREATE INDEX "delivery_attempt_logs_runId_idx" ON "delivery_attempt_logs"("runId");
CREATE INDEX "delivery_attempt_logs_userId_createdAt_idx" ON "delivery_attempt_logs"("userId", "createdAt" DESC);
CREATE INDEX "delivery_attempt_logs_alertId_idx" ON "delivery_attempt_logs"("alertId");

ALTER TABLE "delivery_attempt_logs" ADD CONSTRAINT "delivery_attempt_logs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "cron_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_attempt_logs" ADD CONSTRAINT "delivery_attempt_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_attempt_logs" ADD CONSTRAINT "delivery_attempt_logs_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
