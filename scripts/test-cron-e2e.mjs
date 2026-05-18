import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

async function main() {
  const port = "3003";
  console.log(`Starting dev server on port ${port}...`);
  const server = spawn("bun", ["run", "dev", "--", "--port", port], {
    stdio: "pipe",
    shell: true,
    cwd: process.cwd()
  });

  let ready = false;
  server.stdout.on("data", (data) => {
    const text = data.toString();
    if (text.includes("Ready")) {
      ready = true;
      console.log("Dev server ready.");
    }
  });

  server.stderr.on("data", (data) => {
    const text = data.toString();
    if (text.includes("Ready")) {
      ready = true;
      console.log("Dev server ready (stderr).");
    }
  });

  // Wait up to 20 seconds for the server to be ready
  let waited = 0;
  while (!ready && waited < 20_000) {
    await setTimeout(500);
    waited += 500;
  }

  if (!ready) {
    console.error("Dev server did not become ready in time.");
    server.kill("SIGTERM");
    process.exit(1);
  }

  await setTimeout(1_000);

  console.log("Calling cron endpoint...");
  try {
    const headers = {};
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }
    const response = await fetch(`http://localhost:${port}/api/cron/deliver-alerts`, { headers });
    const body = await response.json().catch(() => ({}));
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(body, null, 2));
  } catch (error) {
    console.error("Fetch error:", error.message);
  }

  console.log("Checking ops endpoint for the cron run record...");
  try {
    const opsKey = process.env.OPS_API_KEY ?? "";
    const opsHeaders = {};
    if (opsKey) {
      opsHeaders["Authorization"] = `Bearer ${opsKey}`;
    }
    const opsResponse = await fetch(`http://localhost:${port}/api/ops/cron-runs`, { headers: opsHeaders });
    const opsBody = await opsResponse.json().catch(() => ({}));
    console.log(`Ops Status: ${opsResponse.status}`);
    if (opsResponse.ok) {
      const runs = opsBody.runs ?? [];
      console.log(`Ops returned ${runs.length} cron run(s).`);
      if (runs.length > 0) {
        const latest = runs[0];
        console.log(`Latest run: ${latest.name} | ${latest.status} | usersChecked: ${latest.usersChecked} | alertsCreated: ${latest.alertsCreated}`);
      }
    } else {
      console.log("Ops error:", JSON.stringify(opsBody, null, 2));
    }
  } catch (error) {
    console.error("Ops fetch error:", error.message);
  }

  console.log("Stopping dev server...");
  server.kill("SIGTERM");
  await setTimeout(1_000);
  if (!server.killed) {
    server.kill("SIGKILL");
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
