import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import { userLookupWhere } from "./set-user-plan.mjs";

export function parseArgs(argv) {
  const args = { user: "", expect: "" };

  for (const arg of argv) {
    if (arg.startsWith("--user=")) {
      args.user = arg.slice("--user=".length).trim();
    }
    if (arg.startsWith("--expect=")) {
      args.expect = arg.slice("--expect=".length).trim();
    }
  }

  return args;
}

export function validateArgs(args) {
  const errors = [];

  if (!args.user) {
    errors.push("Missing required argument: --user=<id|email|githubId|displayName>");
  }

  if (args.expect && !["free", "pro", "team"].includes(args.expect)) {
    errors.push("Invalid --expect value. Use free, pro, or team.");
  }

  return errors;
}

export async function getStripeBillingState(prisma, userRef) {
  const users = await prisma.user.findMany({
    where: userLookupWhere(userRef),
    orderBy: { createdAt: "desc" },
    take: 2,
    select: {
      id: true,
      email: true,
      displayName: true,
      plan: true,
      stripeCustomerId: true,
      subscription: true,
      settings: {
        select: {
          isLifetimeBeta: true
        }
      }
    }
  });

  if (users.length === 0) {
    return { ok: false, status: "not_found", userRef };
  }

  if (users.length > 1) {
    return { ok: false, status: "ambiguous", users };
  }

  const user = users[0];

  return {
    ok: true,
    status: "found",
    user,
    subscription: user.subscription,
    isLifetimeBeta: user.settings?.isLifetimeBeta ?? false
  };
}

export function evaluateBillingExpectation(state, expectPlan) {
  if (!expectPlan) {
    return { ok: true, checks: [] };
  }

  const checks = [
    {
      label: `plan is ${expectPlan}`,
      pass: state.user.plan === expectPlan
    }
  ];

  if (expectPlan === "pro") {
    checks.push({
      label: "stripeCustomerId is set",
      pass: Boolean(state.user.stripeCustomerId)
    });
    checks.push({
      label: "subscription row exists",
      pass: Boolean(state.subscription)
    });
    if (state.subscription) {
      checks.push({
        label: "subscription status is active or trialing",
        pass: ["active", "trialing"].includes(state.subscription.status)
      });
    }
  }

  if (expectPlan === "free" && !state.isLifetimeBeta) {
    checks.push({
      label: "no active paid subscription (or canceled)",
      pass: !state.subscription || state.subscription.status === "canceled"
    });
  }

  return {
    ok: checks.every((check) => check.pass),
    checks
  };
}

function formatUser(user) {
  return `${user.displayName} | ${user.email ?? "no-email"} | id: ${user.id} | plan: ${user.plan}`;
}

function printState(result, evaluation) {
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

  const { user, subscription, isLifetimeBeta } = result;

  console.log(formatUser(user));
  console.log(`stripeCustomerId: ${user.stripeCustomerId ?? "(none)"}`);
  console.log(`isLifetimeBeta: ${isLifetimeBeta}`);

  if (subscription) {
    console.log(
      `subscription: ${subscription.stripeSubscriptionId} | status: ${subscription.status} | price: ${subscription.stripePriceId} | periodEnd: ${subscription.currentPeriodEnd.toISOString()}`
    );
  } else {
    console.log("subscription: (none)");
  }

  if (evaluation.checks.length > 0) {
    console.log("");
    console.log("Expectation checks:");
    for (const check of evaluation.checks) {
      console.log(`  [${check.pass ? "ok" : "FAIL"}] ${check.label}`);
    }
  }
}

function printUsage() {
  console.error(`
Usage:
  node scripts/verify-stripe-billing.mjs --user=<id|email|githubId|displayName>
  node scripts/verify-stripe-billing.mjs --user=user_demo --expect=pro
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = validateArgs(args);

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    printUsage();
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const result = await getStripeBillingState(prisma, args.user);

    if (!result.ok) {
      printState(result, { checks: [] });
      process.exit(1);
    }

    const evaluation = evaluateBillingExpectation(result, args.expect);
    printState(result, evaluation);

    if (!evaluation.ok) {
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
