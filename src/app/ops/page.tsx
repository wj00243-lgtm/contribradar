import type { Metadata } from "next";

import { CronRunsDashboard } from "@/components/ops/cron-runs-dashboard";

export const metadata: Metadata = {
  title: "ContribRadar Ops",
  description: "Private beta operations dashboard"
};

export default function OpsPage() {
  return <CronRunsDashboard />;
}
