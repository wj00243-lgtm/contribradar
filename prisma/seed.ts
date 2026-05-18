import { PrismaClient } from "@prisma/client";
import { seedIssues, seedRepositories } from "../src/data/seed";
import { scoreIssueReadiness, scoreRepositoryReadiness } from "../src/domain/scoring";

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.usageLog.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.watchlistRepo.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.scoreLog.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      id: "user_demo",
      githubId: "10001",
      email: "demo@contribradar.local",
      displayName: "Demo Contributor",
      skillVector: { languages: ["Python", "Rust", "TypeScript"], topics: ["documentation", "cli"] },
      experienceLevel: "beginner",
      weeklyHours: 5,
      plan: "free"
    }
  });

  await prisma.userSettings.create({
    data: {
      userId: user.id,
      alertPreferences: {
        email: false,
        slack: false,
        digest: "weekly"
      },
      aiQuota: 20,
      maxAlerts: 10
    }
  });

  for (const repo of seedRepositories) {
    const readiness = scoreRepositoryReadiness(repo);
    await prisma.repository.create({
      data: {
        id: repo.id,
        githubId: repo.githubId,
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        topics: repo.topics,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        license: repo.license,
        contributorCount: repo.contributorCount,
        sizeKb: repo.sizeKb,
        lastCommitAt: repo.lastCommitAt,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
        readinessScore: readiness.score,
        scoreConfidence: readiness.confidence,
        scoreCalculatedAt: new Date("2026-05-06T00:00:00.000Z"),
        metricMaintainerResponseHours: repo.metrics.maintainerResponseHours,
        metricNewcomerFriendlyScore: readiness.breakdown.find((part) => part.key === "newcomer_friendly")?.score,
        metricCodeHealthScore: readiness.breakdown.find((part) => part.key === "code_health")?.score,
        metricCommunityActivityScore: readiness.breakdown.find((part) => part.key === "community_activity")?.score,
        metricDocumentationScore: readiness.breakdown.find((part) => part.key === "documentation")?.score,
        scoreLogs: {
          create: {
            newScore: readiness.score,
            deltaReason: { explanation: readiness.explanation, warnings: readiness.warnings },
            metricChanges: readiness.breakdown
          }
        }
      }
    });
  }

  for (const issue of seedIssues) {
    const readiness = scoreIssueReadiness(issue);
    await prisma.issue.create({
      data: {
        id: issue.id,
        repoId: issue.repoId,
        githubId: issue.githubId,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels,
        assignees: issue.assignees,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        closedAt: issue.closedAt,
        issueReadinessScore: readiness.score,
        hasAcceptanceCriteria: issue.metrics.acceptanceCriteriaCount > 0,
        commentCount: issue.metrics.commentCount,
        lastCommentAt: issue.lastCommentAt,
        firstResponseHours: issue.firstResponseHours,
        isStale: issue.isStale
      }
    });
  }

  await prisma.watchlist.create({
    data: {
      id: "watchlist_demo",
      userId: user.id,
      name: "First contribution targets",
      description: "High readiness repos for beginner contributors",
      filters: { languages: ["Python"], topics: ["data-science"], minScore: 70 },
      alertEnabled: true,
      digestFrequency: "weekly",
      repos: {
        create: {
          repoId: "repo_pandas",
          notes: "Strong docs and fast maintainer response."
        }
      }
    }
  });

  await prisma.contribution.create({
    data: {
      userId: user.id,
      repoId: "repo_pandas",
      issueId: "issue_pandas_docs",
      type: "issue_comment",
      status: "open",
      githubUrl: "https://github.com/pandas-dev/pandas/issues/1001#issuecomment-1",
      openedAt: new Date("2026-04-20T10:00:00.000Z"),
      impactScore: 64,
      isFirstContribution: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
