CREATE TYPE "ContributionType" AS ENUM ('issue_comment', 'pr_opened', 'pr_merged', 'pr_reviewed');

CREATE TYPE "ContributionStatus" AS ENUM ('open', 'merged', 'closed');

CREATE TABLE "usage_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "period" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_settings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "alertPreferences" JSONB NOT NULL,
  "aiQuota" INTEGER NOT NULL DEFAULT 20,
  "maxAlerts" INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contributions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "repoId" TEXT NOT NULL,
  "issueId" TEXT,
  "type" "ContributionType" NOT NULL,
  "status" "ContributionStatus" NOT NULL,
  "githubUrl" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL,
  "mergedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "linesAdded" INTEGER,
  "linesRemoved" INTEGER,
  "filesChanged" INTEGER,
  "impactScore" DECIMAL(5,2),
  "isFirstContribution" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_logs_userId_feature_period_key" ON "usage_logs"("userId", "feature", "period");
CREATE INDEX "usage_logs_userId_period_idx" ON "usage_logs"("userId", "period");

CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

CREATE INDEX "contributions_userId_openedAt_idx" ON "contributions"("userId", "openedAt" DESC);
CREATE INDEX "contributions_repoId_openedAt_idx" ON "contributions"("repoId", "openedAt" DESC);
CREATE INDEX "contributions_issueId_idx" ON "contributions"("issueId");

ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contributions" ADD CONSTRAINT "contributions_repoId_fkey"
  FOREIGN KEY ("repoId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contributions" ADD CONSTRAINT "contributions_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
