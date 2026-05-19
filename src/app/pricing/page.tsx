import { Check, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { BillingActionButton } from "@/components/billing/billing-action-button";

export const metadata = {
  title: "Pricing | ContribRadar",
  description: "Upgrade to Pro and supercharge your open-source workflow.",
};

export default async function PricingPage() {
  const session = await auth();
  const isPro = session?.user?.plan === "pro" || session?.user?.plan === "team";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30">
      <div className="fixed right-4 top-4 z-40">
        <AuthButtons />
      </div>

      <main className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400 mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Open-source discovery, redefined.</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6">
            Simple pricing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">serious contributors</span>.
          </h1>
          <p className="text-lg text-zinc-400">
            Find the perfect issue, track repository readiness, and let AI match you with your next big open-source impact.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
          {/* Free Tier */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 xl:p-10">
            <h3 className="text-2xl font-semibold mb-2">Free</h3>
            <p className="text-zinc-400 mb-6">Perfect for weekend hackers looking to get started.</p>
            <div className="mb-6 flex items-baseline text-5xl font-extrabold">
              $0
              <span className="ml-1 text-xl font-medium text-zinc-500">/mo</span>
            </div>

            <ul className="space-y-4 mb-8 text-zinc-300">
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Basic issue & repository discovery</span>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Up to 3 watchlists (max 20 repos)</span>
              </li>
              <li className="flex gap-3 opacity-50">
                <Check className="h-5 w-5 text-zinc-600 shrink-0" />
                <span>AI Recommendation Engine</span>
              </li>
              <li className="flex gap-3 opacity-50">
                <Check className="h-5 w-5 text-zinc-600 shrink-0" />
                <span>Smart Email & Slack Alerts</span>
              </li>
              <li className="flex gap-3 opacity-50">
                <Check className="h-5 w-5 text-zinc-600 shrink-0" />
                <span>Repository Readiness Score Trends</span>
              </li>
            </ul>

            <div className="pt-4">
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </div>
          </div>

          {/* Pro Tier */}
          <div className="relative rounded-3xl border border-emerald-500/50 bg-zinc-900/80 p-8 xl:p-10 shadow-2xl shadow-emerald-900/20 overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-cyan-500/20 blur-3xl"></div>
            
            <div className="absolute top-0 right-6 transform -translate-y-1/2">
              <span className="inline-block rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-950 shadow-sm">
                Most Popular
              </span>
            </div>

            <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
              Pro
              <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
            </h3>
            <p className="text-zinc-400 mb-6">For open-source professionals and maintainers.</p>
            <div className="mb-6 flex items-baseline text-5xl font-extrabold text-white">
              $19
              <span className="ml-1 text-xl font-medium text-zinc-400">/mo</span>
            </div>

            <ul className="space-y-4 mb-8 text-zinc-200">
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Unlimited Watchlists & Repositories</span>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>AI Recommendation Engine (20 calls/mo)</span>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Smart Email & Slack Alerts</span>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Repository Readiness Score Trends</span>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Repository Comparison Tool</span>
              </li>
            </ul>

            <div className="pt-4 relative z-10">
              {!session?.user ? (
                <form action={async () => { "use server"; await signIn("github", { redirectTo: "/pricing" }); }}>
                  <Button className="w-full bg-emerald-400 text-zinc-950 hover:bg-emerald-300" size="lg">
                    Log in to Upgrade
                  </Button>
                </form>
              ) : isPro ? (
                <BillingActionButton endpoint="/api/v1/billing-portal" variant="secondary" className="w-full" size="lg">
                  Manage Subscription
                </BillingActionButton>
              ) : (
                <BillingActionButton endpoint="/api/v1/checkout" className="w-full bg-emerald-400 text-zinc-950 hover:bg-emerald-300 group" size="lg">
                  Upgrade to Pro
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </BillingActionButton>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 flex justify-center text-center">
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Shield className="h-4 w-4" />
            Secure payments processed by Stripe. Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
