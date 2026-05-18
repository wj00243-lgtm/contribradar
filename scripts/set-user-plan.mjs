import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

export const allowedPlans = new Set(["free", "pro", "team"]);

export function parseArgs(argv) {
  const args = {
    apply: false,
    plan: "",
    user: ""
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }

    if (arg.startsWith("--plan=")) {
      args.plan = arg.slice("--plan=".length).trim();
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

  if (!allowedPlans.has(args.plan)) {
    errors.push("Missing or invalid required argument: --plan=<free|pro|team>");
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

export async function setUserPlan(prisma, args) {
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
      plan: true
    }
  });

  if (users.length === 0) {
    return { ok: false, status: "not_found", userRef: args.user };
  }

  if (users.length > 1) {
    return { ok: false, status: "ambiguous", users };
  }

  const user = users[0];

  if (!args.apply) {
    return { ok: true, status: "dry_run", user, nextPlan: args.plan };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { plan: args.plan },
    select: {
      id: true,
      email: true,
      githubId: true,
      displayName: true,
      plan: true
    }
  });

  return { ok: true, status: "updated", user: updated, previousPlan: user.plan };
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
    console.log("Dry run only. Re-run with --apply to update the user plan.");
    console.log(`${formatUser(result.user)} -> ${result.nextPlan}`);
    return;
  }

  console.log("User plan updated.");
  console.log(`${formatUser(result.user)} (previous: ${result.previousPlan})`);
}

function formatUser(user) {
  return `${user.displayName} | ${user.email ?? "no-email"} | ${user.githubId ?? "no-github-id"} | id: ${user.id} | plan: ${user.plan}`;
}

function printUsage() {
  console.error(`
Usage:
  bun run ops:user:plan -- --user=<id|email|githubId|displayName> --plan=<free|pro|team>
  bun run ops:user:plan -- --user=<id|email|githubId|displayName> --plan=<free|pro|team> --apply
`);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await setUserPlan(prisma, parseArgs(process.argv.slice(2)));
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
