import type { Plan } from "@/domain/types";
import { normalizePlan } from "@/lib/features";

export type SessionUserInput = {
  id: string;
  githubId?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  plan?: string;
};

export type UserRecord = {
  id: string;
  plan: Plan;
};

export type UserClient = {
  user: {
    findFirst: (args: any) => Promise<UserRecord | null>;
    create: (args: any) => Promise<UserRecord>;
  };
};

export async function ensureUserFromSession(client: UserClient, sessionUser: SessionUserInput): Promise<UserRecord> {
  const existingUser = await client.user.findFirst({
    where: {
      OR: [
        { id: sessionUser.id },
        ...(sessionUser.githubId ? [{ githubId: sessionUser.githubId }] : []),
        ...(sessionUser.email ? [{ email: sessionUser.email }] : [])
      ]
    },
    select: {
      id: true,
      plan: true
    }
  });

  if (existingUser) {
    return existingUser;
  }

  return client.user.create({
    data: {
      id: sessionUser.id,
      githubId: sessionUser.githubId,
      email: sessionUser.email,
      displayName: sessionUser.name ?? sessionUser.email ?? "GitHub user",
      avatarUrl: sessionUser.image,
      skillVector: [],
      experienceLevel: "beginner",
      weeklyHours: 5,
      plan: normalizePlan(sessionUser.plan),
      settings: {
        create: {
          alertPreferences: {
            email: false,
            slack: false,
            digest: "weekly"
          }
        }
      }
    },
    select: {
      id: true,
      plan: true
    }
  });
}
