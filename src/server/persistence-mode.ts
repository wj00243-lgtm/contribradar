export type PersistenceMode = "database" | "database-with-seed-fallback";

type EnvLike = {
  NODE_ENV?: string;
};

export function getPersistenceMode(env: EnvLike = process.env): PersistenceMode {
  return env.NODE_ENV === "production" ? "database" : "database-with-seed-fallback";
}

export function shouldAllowSeedFallback(env: EnvLike = process.env): boolean {
  return getPersistenceMode(env) === "database-with-seed-fallback";
}
