import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const required = [
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
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "OPS_API_KEY"
];

export const optional = ["OPENAI_API_KEY", "GITHUB_TOKEN", "GITHUB_INGEST_REPOS", "SENTRY_DSN"];

export function loadEnvFiles(cwd = process.cwd()) {
  return [".env", ".env.local"].reduce((values, fileName) => {
    const filePath = resolve(cwd, fileName);

    if (!existsSync(filePath)) {
      return values;
    }

    return {
      ...values,
      ...parseEnvFile(readFileSync(filePath, "utf8"))
    };
  }, {});
}

export function parseEnvFile(content) {
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    values[key] = stripQuotes(value);
  }

  return values;
}

export function checkEnvironment(env) {
  const missing = required.filter((name) => !env[name]);
  const missingOptional = optional.filter((name) => !env[name]);

  return {
    ok: missing.length === 0,
    missing,
    missingOptional
  };
}

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function main() {
  const env = {
    ...loadEnvFiles(),
    ...process.env
  };
  const result = checkEnvironment(env);

  if (!result.ok) {
    console.error(`Missing required environment variables: ${result.missing.join(", ")}`);
    process.exit(1);
  }

  if (result.missingOptional.length > 0) {
    console.warn(`Optional feature variables not set: ${result.missingOptional.join(", ")}`);
  }

  console.log("Required environment variables are present.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
