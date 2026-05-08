import { DiscoveryDashboard } from "@/components/discovery/discovery-dashboard";
import { discoverIssues, discoverRepositories } from "@/server/discovery";

export default function HomePage() {
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
    <DiscoveryDashboard
      repos={repositoryResults.repos}
      total={repositoryResults.total}
      facets={repositoryResults.facets}
      issues={issueResults.issues}
    />
  );
}
