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

for (const repository of args.repositories) {
  const scoreResponse = await fetch(`${baseUrl}/api/v1/discover/repos/${encodeRepositoryPath(repository)}/score`);
  const scoreBody = await readJson(scoreResponse);
  const repo = scoreBody?.repository;
  const repoFound = scoreResponse.status === 200 && repo?.fullName === repository;

  console.log(`${repoFound ? "PASS" : "FAIL"} Repository score visible in discovery: ${repository}`);

  if (!repoFound) {
    console.log(JSON.stringify(scoreBody, null, 2));
    failures += 1;
    continue;
  }

  const ingestedRepository = ingestionBody?.repositories?.find((item) => item.repository === repository);
  const expectedIssueCount = ingestedRepository?.issuesUpserted ?? 0;

  if (expectedIssueCount === 0) {
    console.log(`SKIP Issue discovery for ${repository}: ingestion reported 0 issues upserted`);
    continue;
  }

  const issuesResponse = await fetch(`${baseUrl}/api/v1/discover/issues?repo_id=${encodeURIComponent(repo.id)}&limit=100`);
  const issuesBody = await readJson(issuesResponse);
  const issueCount = Array.isArray(issuesBody?.issues) ? issuesBody.issues.length : 0;
  const issueOk = issuesResponse.status === 200 && issueCount > 0;

  console.log(`${issueOk ? "PASS" : "FAIL"} Issue discovery for ${repository}: ${issuesResponse.status} (${issueCount} shown)`);

  if (!issueOk) {
    console.log(JSON.stringify(issuesBody, null, 2));
    failures += 1;
  }
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

function encodeRepositoryPath(repository) {
  const [owner, repo, extra] = repository.split("/");

  if (!owner || !repo || extra) {
    return encodeURIComponent(repository);
  }

  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
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
