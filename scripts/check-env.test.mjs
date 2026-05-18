import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkEnvironment, loadEnvFiles, parseEnvFile, required } from "./check-env.mjs";

describe("check-env", () => {
  it("requires production-critical service and auth variables", () => {
    expect(required).toEqual([
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
      "OPS_API_KEY"
    ]);
  });

  it("reports missing required values separately from optional feature values", () => {
    const result = checkEnvironment({
      DATABASE_URL: "postgresql://localhost/db",
      AUTH_SECRET: "secret",
      AUTH_URL: "http://localhost:3000",
      AUTH_GITHUB_ID: "github_id",
      AUTH_GITHUB_SECRET: "github_secret"
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      "GEMINI_API_KEY",
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "SLACK_WEBHOOK_URL",
      "CRON_SECRET",
      "OPS_API_KEY"
    ]);
    expect(result.missingOptional).toEqual(["OPENAI_API_KEY", "GITHUB_TOKEN", "GITHUB_INGEST_REPOS", "SENTRY_DSN"]);
  });

  it("parses quoted .env values without requiring a dotenv dependency", () => {
    expect(parseEnvFile("DATABASE_URL=\"postgresql://localhost/db\"\nOPS_API_KEY='secret'\n# ignored\nEMPTY=\n")).toEqual({
      DATABASE_URL: "postgresql://localhost/db",
      OPS_API_KEY: "secret",
      EMPTY: ""
    });
  });

  it("loads .env before .env.local so local values can override defaults", () => {
    const cwd = mkdtempSync(join(tmpdir(), "contribradar-env-"));
    writeFileSync(join(cwd, ".env"), "DATABASE_URL=\"postgresql://localhost/db\"\nOPS_API_KEY=from-env\n");
    writeFileSync(join(cwd, ".env.local"), "OPS_API_KEY=from-local\n");

    const values = loadEnvFiles(cwd);

    expect(values.DATABASE_URL).toBe("postgresql://localhost/db");
    expect(values.OPS_API_KEY).toBe("from-local");
  });
});
