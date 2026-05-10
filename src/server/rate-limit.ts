type RateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function createRateLimiter({ limit, windowMs, now = () => Date.now() }: RateLimitOptions) {
  const buckets = new Map<string, RateLimitBucket>();

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const current = buckets.get(key);

      if (!current || current.resetAt <= currentTime) {
        const resetAt = currentTime + windowMs;
        buckets.set(key, { count: 1, resetAt });

        return {
          allowed: true,
          remaining: Math.max(0, limit - 1),
          resetAt
        };
      }

      if (current.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: current.resetAt
        };
      }

      current.count += 1;

      return {
        allowed: true,
        remaining: Math.max(0, limit - current.count),
        resetAt: current.resetAt
      };
    }
  };
}
