import { LogIn, LogOut } from "lucide-react";

import { auth, isAuthConfigured, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function AuthButtons() {
  const session = await auth();

  if (session?.user) {
    return (
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
