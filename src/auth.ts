import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

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
    jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.githubId = account.providerAccountId;
      }

      token.plan = token.plan ?? "free";

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.githubId = typeof token.githubId === "string" ? token.githubId : undefined;
      session.user.plan = typeof token.plan === "string" ? token.plan : "free";

      return session;
    }
  }
});
