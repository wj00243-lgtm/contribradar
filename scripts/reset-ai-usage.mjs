import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

const FEATURE = "ai_recommendation";

export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parseArgs(argv) {
  const args = {
    apply: false,
    period: currentPeriod(),
    user: ""
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }

    if (arg.startsWith("--period=")) {
      args.period = arg.slice("--period=".length).trim();
      continue;
    }

    if (arg.startsWith("--user=")) {
      args.user = arg.slice("--user=".length).trim();
    }
  }

  return args;
}

export function validateArgs(args) {
  const errors = [];

  if (!args.user) {
    errors.push("Missing required argument: --user=<id|email|githubId|displayName>");
  }

  if (!/^\d{4}-\d{2}$/.test(args.period)) {
    errors.push("Invalid --period value. Use YYYY-MM.");
  }

  return errors;
}

export function userLookupWhere(userRef) {
  return {
    OR: [
      { id: userRef },
      { email: userRef },
      { githubId: userRef },
      { displayName: userRef }
    ]
  };
}

export async function resetAiUsage(prisma, args) {
  const errors = validateArgs(args);

  if (errors.length > 0) {
    return { ok: false, status: "invalid_args", errors };
  }

  const users = await prisma.user.findMany({
    where: userLookupWhere(args.user),
    orderBy: { createdAt: "desc" },
    take: 2,
    select: {
      id: true,
      email: true,
      githubId: true,
      displayName: true,
      plan: true,
      usageLogs: {
        where: {
          feature: FEATURE,
          period: args.period
        },
        select: {
          count: true,
          period: true,
          updatedAt: true
        }
      }
    }
  });

  if (users.length === 0) {
    return { ok: false, status: "not_found", userRef: args.user };
  }

  if (users.length > 1) {
    return { ok: false, status: "ambiguous", users };
  }

  const user = users[0];
  const usage = user.usageLogs[0] ?? null;

  if (!args.apply) {
    return { ok: true, status: "dry_run", user, period: args.period, usage };
  }

  const deletion = await prisma.usageLog.deleteMany({
    where: {
      userId: user.id,
      feature: FEATURE,
      period: args.period
    }
  });

  return { ok: true, status: "reset", user, period: args.period, deleted: deletion.count, previousUsage: usage };
}

function printResult(result) {
  if (result.status === "invalid_args") {
    console.error(result.errors.join("\n"));
    printUsage();
    return;
  }

  if (result.status === "not_found") {
    console.error(`No user found for ${result.userRef}.`);
    return;
  }

  if (result.status === "ambiguous") {
    console.error("Multiple users matched. Re-run with the exact user id.");
    for (const user of result.users) {
      console.error(formatUser(user));
    }
    return;
  }

  if (result.status === "dry_run") {
    console.log("Dry run only. Re-run with --apply to reset AI recommendation usage.");
    console.log(formatUser(result.user));
    console.log(formatUsage(result.period, result.usage));
    return;
  }

  console.log("AI recommendation usage reset.");
  console.log(formatUser(result.user));
  console.log(formatUsage(result.period, result.previousUsage));
  console.log(`  deleted rows: ${result.deleted}`);
}

function formatUser(user) {
  return `${user.displayName} | ${user.email ?? "no-email"} | ${user.githubId ?? "no-github-id"} | id: ${user.id} | plan: ${user.plan}`;
}

function formatUsage(period, usage) {
  if (!usage) {
    return `  ai usage: 0 for ${period} (no usage row)`;
  }

  return `  ai usage: ${usage.count} for ${usage.period} (updated: ${usage.updatedAt.toISOString()})`;
}

function printUsage() {
  console.error(`
Usage:
  bun run ops:ai:reset -- --user=<id|email|githubId|displayName>
  bun run ops:ai:reset -- --user=<id|email|githubId|displayName> --period=YYYY-MM --apply
`);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await resetAiUsage(prisma, parseArgs(process.argv.slice(2)));
    printResult(result);

    if (!result.ok) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
