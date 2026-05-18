import type { ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type FeatureName, hasFeature, meetsRequiredPlan, type UserPlan } from "@/lib/features";

type ProGateProps = {
  userPlan?: string | null;
  requiredPlan?: Extract<UserPlan, "pro" | "team">;
  featureName?: FeatureName;
  fallback?: ReactNode;
  children: ReactNode;
};

export function ProGate({ userPlan, requiredPlan = "pro", featureName, fallback, children }: ProGateProps) {
  const isAllowed = featureName ? hasFeature(userPlan, featureName) : meetsRequiredPlan(userPlan, requiredPlan);

  if (isAllowed) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none select-none blur-sm opacity-45">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 p-6">
        <div className="max-w-sm text-center">
          <div className="mb-3 flex justify-center">
            <Badge variant="secondary">{requiredPlan.toUpperCase()}</Badge>
          </div>
          <LockKeyhole className="mx-auto mb-3 h-6 w-6 text-emerald-300" />
          <h3 className="text-base font-semibold text-zinc-50">Pro feature</h3>
          <p className="mt-2 text-sm text-zinc-400">Upgrade to unlock this workflow and keep your contributor pipeline moving.</p>
          <Button className="mt-4" size="sm" asChild>
            <Link href="/pricing">Upgrade</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
