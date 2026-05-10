import { NextResponse, type NextRequest } from "next/server";

import { createRateLimiter } from "@/server/rate-limit";

const apiLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60_000
});

const protectedRateLimitPaths = new Set([
  "/api/v1/recommendations",
  "/api/cron/deliver-alerts"
]);

export function middleware(request: NextRequest) {
  const response = maybeRateLimit(request) ?? NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");

  return response;
}

function maybeRateLimit(request: NextRequest) {
  if (!protectedRateLimitPaths.has(request.nextUrl.pathname)) {
    return null;
  }

  const key = `${request.nextUrl.pathname}:${clientIp(request)}`;
  const result = apiLimiter.check(key);

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again shortly."
      }
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)))
      }
    }
  );
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export const config = {
  matcher: ["/api/:path*"]
};
