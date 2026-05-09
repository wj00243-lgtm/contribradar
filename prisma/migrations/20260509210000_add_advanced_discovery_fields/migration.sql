ALTER TABLE "repositories" ADD COLUMN "license" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "repositories" ADD COLUMN "contributorCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "repositories_license_idx" ON "repositories"("license");
CREATE INDEX "repositories_contributorCount_idx" ON "repositories"("contributorCount");
