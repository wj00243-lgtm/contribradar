export type UserPlan = "free" | "pro" | "team";

export type FeatureName =
  | "aiRecommendations"
  | "smartAlerts"
  | "repoComparison"
  | "scoreTrends"
  | "unlimitedWatchlists"
  | "teamDashboard";

const planRank: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  team: 2
};

const featurePlans = {
  aiRecommendations: "pro",
  smartAlerts: "pro",
  repoComparison: "pro",
  scoreTrends: "pro",
  unlimitedWatchlists: "pro",
  teamDashboard: "team"
} satisfies Record<FeatureName, UserPlan>;

export function normalizePlan(plan: string | null | undefined): UserPlan {
  if (plan === "pro" || plan === "team") {
    return plan;
  }

  return "free";
}

export function meetsRequiredPlan(userPlan: string | null | undefined, requiredPlan: UserPlan): boolean {
  return planRank[normalizePlan(userPlan)] >= planRank[requiredPlan];
}

export function hasFeature(userPlan: string | null | undefined, featureName: string): boolean {
  if (!isFeatureName(featureName)) {
    return false;
  }

  return meetsRequiredPlan(userPlan, featurePlans[featureName]);
}

function isFeatureName(featureName: string): featureName is FeatureName {
  return Object.hasOwn(featurePlans, featureName);
}
