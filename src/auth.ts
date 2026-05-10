import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

import { prisma } from "@/server/db";
import { ensureUserFromSession } from "@/server/users";

const githubClientId = process.env.AUTH_GITHUB_ID;
const githubClientSecret = process.env.AUTH_GITHUB_SECRET;

export const isAuthConfigured = Boolean(githubClientId && githubClientSecret);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isAuthConfigured
    ? [
        GitHub({
          clientId: githubClientId,
          clientSecret: githubClientSecret
        })
      ]
    : [],
  session: {
    strategy: "jwt"
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.providerAccountId) {
        token.githubId = account.providerAccountId;
      }

      if (token.sub) {
        const appUser = await ensureUserFromSession(prisma, {
          id: token.sub,
          githubId: typeof token.githubId === "string" ? token.githubId : undefined,
          email: typeof token.email === "string" ? token.email : user?.email,
          name: typeof token.name === "string" ? token.name : user?.name,
          image: typeof token.picture === "string" ? token.picture : user?.image,
          plan: typeof token.plan === "string" ? token.plan : undefined
        });

        token.appUserId = appUser.id;
        token.plan = appUser.plan;
      } else {
        token.plan = token.plan ?? "free";
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = typeof token.appUserId === "string" ? token.appUserId : token.sub ?? "";
      session.user.githubId = typeof token.githubId === "string" ? token.githubId : undefined;
      session.user.plan = typeof token.plan === "string" ? token.plan : "free";

      return session;
    }
  }
});
