import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "vercel.json",
  "docs/ops/vercel-deployment.md",
  "docs/ops/deploy-smoke.md",
  "docs/ops/final-release-checklist.md",
  "docs/ops/launch-plan.md",
  "docs/ops/monitoring.md",
  "docs/ops/release-tagging.md"
];

const requiredEnvNames = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "SLACK_WEBHOOK_URL",
  "CRON_SECRET",
  "SENTRY_DSN"
];

const failures = [];
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

if (packageJson.version !== "1.0.0") {
  failures.push(`package.json version must be 1.0.0, found ${packageJson.version}`);
}

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`missing required ops file: ${file}`);
  }
}

const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
const hasDeliveryCron = Array.isArray(vercelConfig.crons) && vercelConfig.crons.some((cron) => cron.path === "/api/cron/deliver-alerts");

if (!hasDeliveryCron) {
  failures.push("vercel.json must configure /api/cron/deliver-alerts");
}

const envExample = readFileSync(".env.example", "utf8");

for (const name of requiredEnvNames) {
  if (!envExample.includes(`${name}=`)) {
    failures.push(`.env.example must include ${name}`);
  }
}

if (failures.length > 0) {
  console.error("Launch readiness failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Launch readiness checks passed.");
