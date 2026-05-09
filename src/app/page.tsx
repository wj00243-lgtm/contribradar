import { AuthButtons } from "@/components/auth/auth-buttons";
import { DiscoveryDashboard } from "@/components/discovery/discovery-dashboard";
import { auth } from "@/auth";
import { discoverIssues, discoverRepositories } from "@/server/discovery";

export default async function HomePage() {
  const session = await auth();
  const repositoryResults = discoverRepositories({
    minScore: 50,
    sort: "score",
    page: 1,
    limit: 10
  });
  const issueResults = discoverIssues({
    minIssueScore: 50,
    hasNoAssignee: true,
    page: 1,
    limit: 5
  });

  return (
    <>
      <div className="fixed right-4 top-4 z-40">
        <AuthButtons />
      </div>
      <DiscoveryDashboard
        repos={repositoryResults.repos}
        total={repositoryResults.total}
        facets={repositoryResults.facets}
        issues={issueResults.issues}
        userPlan={session?.user?.plan}
      />
    </>
  );
}
