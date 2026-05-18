const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!args.baseUrl) {
  console.error("Missing required argument: --base-url");
  printHelp();
  process.exit(1);
}

const baseUrl = args.baseUrl.replace(/\/+$/, "");
const checks = [
  { name: "Repository discovery", path: "/api/v1/discover/repos", expected: [200] },
  { name: "Issue discovery", path: "/api/v1/discover/issues", expected: [200] },
  {
    name: "Alert delivery cron",
    path: "/api/cron/deliver-alerts",
    expected: args.cronSecret ? [200] : [401],
    headers: args.cronSecret ? { Authorization: `Bearer ${args.cronSecret}` } : undefined,
    skip: args.skipCron
  },
  {
    name: "GitHub ingestion cron",
    path: "/api/cron/ingest-github",
    expected: args.cronSecret ? [200] : [401],
    headers: args.cronSecret ? { Authorization: `Bearer ${args.cronSecret}` } : undefined,
    skip: args.skipCron
  }
];

let failures = 0;

for (const check of checks) {
  if (check.skip) {
    console.log(`SKIP ${check.name}`);
    continue;
  }

  const response = await fetch(`${baseUrl}${check.path}`, {
    method: "GET",
    headers: check.headers
  });
  const ok = check.expected.includes(response.status);

  console.log(`${ok ? "PASS" : "FAIL"} ${check.name}: ${response.status}`);

  if (!ok) {
    failures += 1;
  }
}

if (failures > 0) {
  process.exit(1);
}

function parseArgs(values) {
  const result = {
    baseUrl: "",
    cronSecret: "",
    skipCron: false,
    help: false
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--help" || value === "-h") {
      result.help = true;
    } else if (value === "--base-url") {
      result.baseUrl = values[index + 1] ?? "";
      index += 1;
    } else if (value === "--cron-secret") {
      result.cronSecret = values[index + 1] ?? "";
      index += 1;
    } else if (value === "--skip-cron") {
      result.skipCron = true;
    } else {
      console.error(`Unknown argument: ${value}`);
      result.help = true;
    }
  }

  return result;
}

function printHelp() {
  console.log(`Usage:
  node scripts/deploy-smoke.mjs --base-url <url> [--cron-secret <secret>] [--skip-cron]

Examples:
  node scripts/deploy-smoke.mjs --base-url https://contribradar.example.com --cron-secret "$CRON_SECRET"
  node scripts/deploy-smoke.mjs --base-url http://localhost:3000 --skip-cron`);
}
