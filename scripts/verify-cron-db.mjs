import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const runs = await prisma.cronRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { attempts: { take: 5 } }
    });

    console.log(`Found ${runs.length} cron run(s) in the database.`);

    for (const run of runs) {
      console.log(
        `- ${run.name} | ${run.status} | users: ${run.usersChecked} | alerts: ${run.alertsCreated} | failures: ${run.failures} | attempts: ${run.attempts.length}`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
