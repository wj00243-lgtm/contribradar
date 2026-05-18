import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

export function parseArgs(argv) {
  const args = {
    aiQuota: undefined,
    alertPreferences: undefined,
    apply: false,
    maxAlerts: undefined,
    user: ""
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }

    if (arg.startsWith("--user=")) {
      args.user = arg.slice("--user=".length).trim();
      continue;
    }

    if (arg.startsWith("--ai-quota=")) {
      args.aiQuota = parseNonNegativeInt(arg.slice("--ai-quota=".length));
      continue;
    }

    if (arg.startsWith("--max-alerts=")) {
      args.maxAlerts = parseNonNegativeInt(arg.slice("--max-alerts=".length));
    }
  }

  return args;
}

export function validateArgs(args) {
  const errors = [];

  if (!args.user) {
    errors.push("Missing required argument: --user=<id|email|githubId|displayName>");
  }

  if (args.aiQuota === undefined && args.maxAlerts === undefined) {
    errors.push("Set at least one quota: --ai-quota=<number> or --max-alerts=<number>");
  }

  if (args.aiQuota !== undefined && !isValidQuota(args.aiQuota)) {
    errors.push("Invalid --ai-quota value. Use a non-negative integer.");
  }

  if (args.maxAlerts !== undefined && !isValidQuota(args.maxAlerts)) {
    errors.push("Invalid --max-alerts value. Use a non-negative integer.");
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

export function nextSettingsData(args) {
  return {
    ...(args.aiQuota === undefined ? {} : { aiQuota: args.aiQuota }),
    ...(args.maxAlerts === undefined ? {} : { maxAlerts: args.maxAlerts })
  };
}

export async function setUserQuota(prisma, args) {
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
      settings: {
        select: {
          aiQuota: true,
          maxAlerts: true,
          alertPreferences: true
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
  const data = nextSettingsData(args);

  if (!args.apply) {
    return { ok: true, status: "dry_run", user, nextSettings: data };
  }

  const updatedSettings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      alertPreferences: user.settings?.alertPreferences ?? {},
      aiQuota: args.aiQuota ?? 20,
      maxAlerts: args.maxAlerts ?? 10
    },
    update: data,
    select: {
      aiQuota: true,
      maxAlerts: true
    }
  });

  return {
    ok: true,
    status: "updated",
    user,
    previousSettings: {
      aiQuota: user.settings?.aiQuota ?? 20,
      maxAlerts: user.settings?.maxAlerts ?? 10
    },
    updatedSettings
  };
}

function parseNonNegativeInt(value) {
  if (!/^\d+$/.test(value.trim())) {
    return Number.NaN;
  }

  return Number(value);
}

function isValidQuota(value) {
  return Number.isInteger(value) && value >= 0;
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
    console.log("Dry run only. Re-run with --apply to update user quota settings.");
    console.log(formatUser(result.user));
    console.log(`  next settings: ${JSON.stringify(result.nextSettings)}`);
    return;
  }

  console.log("User quota settings updated.");
  console.log(formatUser(result.user));
  console.log(`  previous settings: ${JSON.stringify(result.previousSettings)}`);
  console.log(`  updated settings: ${JSON.stringify(result.updatedSettings)}`);
}

function formatUser(user) {
  return `${user.displayName} | ${user.email ?? "no-email"} | ${user.githubId ?? "no-github-id"} | id: ${user.id} | plan: ${user.plan}`;
}

function printUsage() {
  console.error(`
Usage:
  bun run ops:user:quota -- --user=<id|email|githubId|displayName> --ai-quota=<number>
  bun run ops:user:quota -- --user=<id|email|githubId|displayName> --ai-quota=<number> --max-alerts=<number> --apply
`);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await setUserQuota(prisma, parseArgs(process.argv.slice(2)));
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
