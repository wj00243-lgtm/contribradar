import { LogIn, LogOut } from "lucide-react";

import { auth, isAuthConfigured, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function AuthButtons() {
  const session = await auth();

  if (session?.user) {
    const isPro = session.user.plan === "pro" || session.user.plan === "team";

    return (
      <div className="flex items-center gap-2">
        {isPro ? (
          <form action="/api/v1/billing-portal" method="POST">
            <Button type="submit" variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              Manage Billing
            </Button>
          </form>
        ) : (
          <Button variant="default" size="sm" className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300" asChild>
            <a href="/pricing">Upgrade to Pro</a>
          </Button>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        if (isAuthConfigured) {
          await signIn("github");
        }
      }}
    >
      <Button type="submit" variant="secondary" size="sm" disabled={!isAuthConfigured}>
        <LogIn className="h-4 w-4" />
        Login
      </Button>
    </form>
  );
}
