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

if (!args.opsApiKey) {
  console.error("Missing required argument or environment variable: --ops-api-key or OPS_API_KEY");
  process.exit(1);
}

if (args.repositories.length === 0) {
  console.error("Missing repository refs. Pass --repo owner/repo at least once.");
  printHelp();
  process.exit(1);
}

if (args.repositories.length > 10) {
  console.error("Too many repositories. The ops ingestion endpoint accepts at most 10 repositories.");
  process.exit(1);
}

const baseUrl = args.baseUrl.replace(/\/+$/, "");
let failures = 0;

const ingestionResponse = await postJson(`${baseUrl}/api/ops/ingest-github`, {
  repositories: args.repositories
});
const ingestionBody = await readJson(ingestionResponse);
const ingestionOk =
  ingestionResponse.status === 200 &&
  ingestionBody?.totals?.requested === args.repositories.length &&
  ingestionBody?.totals?.succeeded >= 1;

console.log(`${ingestionOk ? "PASS" : "FAIL"} GitHub ingestion: ${ingestionResponse.status}`);

if (!ingestionOk) {
  console.log(JSON.stringify(ingestionBody, null, 2));
  failures += 1;
}

const reposResponse = await fetch(`${baseUrl}/api/v1/discover/repos?limit=100`);
const reposBody = await readJson(reposResponse);
const discoveredRepos = Array.isArray(reposBody?.repos) ? reposBody.repos : [];

for (const repository of args.repositories) {
  const repoFound = discoveredRepos.some((repo) => repo.fullName === repository);

  console.log(`${repoFound ? "PASS" : "FAIL"} Repository visible in discovery: ${repository}`);

  if (!repoFound) {
    failures += 1;
  }
}

const issuesResponse = await fetch(`${baseUrl}/api/v1/discover/issues?limit=100`);
const issuesBody = await readJson(issuesResponse);
const discoveredIssues = Array.isArray(issuesBody?.issues) ? issuesBody.issues : [];
const issueCount = discoveredIssues.length;
const issueOk = issuesResponse.status === 200 && issueCount > 0;

console.log(`${issueOk ? "PASS" : "FAIL"} Issue discovery returns DB issues: ${issuesResponse.status} (${issueCount} shown)`);

if (!issueOk) {
  failures += 1;
}

if (failures > 0) {
  process.exit(1);
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.opsApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseArgs(values) {
  const result = {
    baseUrl: "",
    opsApiKey: process.env.OPS_API_KEY ?? "",
    repositories: [],
    help: false
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--help" || value === "-h") {
      result.help = true;
    } else if (value === "--base-url") {
      result.baseUrl = values[index + 1] ?? "";
      index += 1;
    } else if (value === "--ops-api-key") {
      result.opsApiKey = values[index + 1] ?? "";
      index += 1;
    } else if (value === "--repo") {
      const repository = values[index + 1] ?? "";
      if (repository) {
        result.repositories.push(repository);
      }
      index += 1;
    } else {
      console.error(`Unknown argument: ${value}`);
      result.help = true;
    }
  }

  return result;
}

function printHelp() {
  console.log(`Usage:
  node scripts/verify-github-ingestion.mjs --base-url <url> --repo <owner/repo> [--repo <owner/repo>] [--ops-api-key <secret>]

Examples:
  node scripts/verify-github-ingestion.mjs --base-url https://contribradar.vercel.app --repo vercel/next.js
  node scripts/verify-github-ingestion.mjs --base-url http://localhost:3000 --repo prisma/prisma --ops-api-key "$env:OPS_API_KEY"`);
}
