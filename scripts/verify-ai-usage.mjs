import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const userRef = process.argv.find((arg) => arg.startsWith("--user="))?.slice("--user=".length);

function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const userWhere = userRef
    ? {
        OR: [{ id: userRef }, { email: userRef }, { githubId: userRef }]
      }
    : {};

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: { createdAt: "desc" },
    take: userRef ? 5 : 10,
    select: {
      id: true,
      email: true,
      githubId: true,
      displayName: true,
      plan: true,
      settings: {
        select: {
          aiQuota: true
        }
      },
      usageLogs: {
        where: {
          feature: "ai_recommendation",
          period: currentPeriod()
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
    console.log(userRef ? `No users found for ${userRef}.` : "No users found.");
    return;
  }

  for (const user of users) {
    const usage = user.usageLogs[0];
    const limit = user.settings?.aiQuota ?? 20;
    const used = usage?.count ?? 0;

    console.log(`${user.displayName} | ${user.email ?? "no-email"} | ${user.githubId ?? "no-github-id"}`);
    console.log(`  id: ${user.id}`);
    console.log(`  plan: ${user.plan}`);
    console.log(`  ai usage: ${used}/${limit} for ${usage?.period ?? currentPeriod()} (${Math.max(limit - used, 0)} remaining)`);
    if (usage?.updatedAt) {
      console.log(`  updated: ${usage.updatedAt.toISOString()}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
