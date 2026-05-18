import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "./check-env.mjs";

const WEBHOOK_PATH = "/api/webhooks/stripe";
const DEFAULT_USER = "user_demo";

export function parseArgs(argv) {
  const args = {
    command: "guide",
    user: DEFAULT_USER,
    sub: ""
  };

  const [command = "guide", ...rest] = argv;

  if (["check", "guide", "trigger-checkout", "cancel", "ping"].includes(command)) {
    args.command = command;
  }

  for (const arg of rest) {
    if (arg.startsWith("--user=")) {
      args.user = arg.slice("--user=".length).trim();
    }
    if (arg.startsWith("--sub=")) {
      args.sub = arg.slice("--sub=".length).trim();
    }
  }

  return args;
}

export function stripeEnvStatus(env = process.env) {
  const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"];
  const missing = required.filter((name) => !env[name]);
  return { ok: missing.length === 0, missing };
}

export function hasStripeCli() {
  const result = spawnSync("stripe", ["--version"], { encoding: "utf8", shell: true });
  return result.status === 0;
}

export function runStripeCommand(args) {
  return spawnSync("stripe", args, {
    encoding: "utf8",
    shell: true,
    stdio: "inherit"
  });
}

export function buildCheckoutTriggerArgs(userId) {
  return [
    "trigger",
    "checkout.session.completed",
    "--override",
    `checkout_session:client_reference_id=${userId}`,
    "--override",
    "checkout_session:mode=subscription"
  ];
}

function printGuide() {
  console.log(`
Stripe webhook local workflow (ContribRadar)

Terminal 1 — app:
  npm run dev

Terminal 2 — forward signed events (keep running):
  stripe listen --forward-to localhost:3000${WEBHOOK_PATH}
  Copy whsec_... into .env.local as STRIPE_WEBHOOK_SECRET, then restart Terminal 1.

Terminal 3 — commands:
  npm run qa:stripe:check
  npm run qa:stripe:ping
  npm run qa:stripe:trigger -- --user=user_demo
  npm run qa:stripe:billing -- --user=user_demo --expect=pro
  npm run qa:stripe:cancel -- --sub=sub_XXXXXXXX

Recommended end-to-end path:
  1) npm run prisma:seed
  2) stripe listen + set STRIPE_WEBHOOK_SECRET + restart dev
  3) Sign in locally and complete checkout from /pricing (test card 4242...)
  4) npm run qa:stripe:billing -- --user=<your-user-id> --expect=pro
  5) npm run qa:stripe:cancel -- --sub=<stripeSubscriptionId from DB>
  6) npm run qa:stripe:billing -- --user=<your-user-id> --expect=free

Notes:
  - stripe trigger checkout needs an existing DB user (--user defaults to user_demo).
  - customer.subscription.deleted via trigger alone usually won't match DB; prefer cancel on a real sub id.
`);
}

function commandCheck(env) {
  const status = stripeEnvStatus(env);

  if (!hasStripeCli()) {
    console.error("Stripe CLI not found. Install: https://stripe.com/docs/stripe-cli");
    process.exit(1);
  }

  console.log("Stripe CLI: ok");

  if (!status.ok) {
    console.error(`Missing env: ${status.missing.join(", ")}`);
    console.error("Set them in .env.local. STRIPE_WEBHOOK_SECRET comes from `stripe listen`.");
    process.exit(1);
  }

  console.log("Stripe env: ok (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID)");
  console.log(`Webhook URL: http://localhost:3000${WEBHOOK_PATH}`);
  console.log("Ensure `npm run dev` and `stripe listen --forward-to ...` are running before triggers.");
}

function commandTriggerCheckout(args) {
  if (!hasStripeCli()) {
    console.error("Stripe CLI not found.");
    process.exit(1);
  }

  console.log(`Triggering checkout.session.completed for client_reference_id=${args.user}`);
  console.log("Prerequisite: user must exist in DB (npm run prisma:seed creates user_demo).");

  const result = runStripeCommand(buildCheckoutTriggerArgs(args.user));
  process.exit(result.status ?? 1);
}

function commandCancel(args) {
  if (!args.sub) {
    console.error("Missing --sub=sub_xxx (use subscription id from Prisma / qa:stripe:billing).");
    process.exit(1);
  }

  if (!hasStripeCli()) {
    console.error("Stripe CLI not found.");
    process.exit(1);
  }

  console.log(`Canceling subscription ${args.sub} (fires customer.subscription.deleted when listen is active).`);
  const result = runStripeCommand(["subscriptions", "cancel", args.sub]);
  process.exit(result.status ?? 1);
}

function commandPing() {
  if (!hasStripeCli()) {
    console.error("Stripe CLI not found.");
    process.exit(1);
  }

  const result = runStripeCommand(["trigger", "ping"]);
  process.exit(result.status ?? 1);
}

async function main() {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const env = { ...loadEnvFiles(cwd), ...process.env };

  switch (args.command) {
    case "guide":
      printGuide();
      break;
    case "check":
      commandCheck(env);
      break;
    case "trigger-checkout":
      commandTriggerCheckout(args);
      break;
    case "cancel":
      commandCancel(args);
      break;
    case "ping":
      commandPing();
      break;
    default:
      printGuide();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
