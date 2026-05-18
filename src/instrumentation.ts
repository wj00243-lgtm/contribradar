import * as Sentry from "@sentry/nextjs";

/**
 * Server-side instrumentation for Sentry error tracking.
 * Initializes Sentry SDK to capture unhandled exceptions,
 * failed cron runs, and delivery adapter failures.
 *
 * This file is loaded automatically by Next.js 15+ when present.
 * Reference: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side Sentry initialization
    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || "development";

    if (dsn) {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: environment === "production" ? 0.1 : 1.0,
        attachStacktrace: true,

        // Ignore known, non-critical errors
        beforeSend(event) {
          // Ignore rate limit responses (429) from external APIs
          if (event.exception && Array.isArray((event.exception as any).values)) {
            const values = (event.exception as any).values as Array<{ value?: string }>;
            const exception = values[0];
            if (exception && exception.value) {
              const errorMessage = exception.value;
              if (
                errorMessage.includes("429") ||
                errorMessage.includes("rate limit") ||
                errorMessage.includes("RATE_LIMITED")
              ) {
                return null;
              }
            }
          }
          return event;
        }
      });
    }
  }
}

// Initialize on import (safe no-op if SENTRY_DSN is not configured)
void register();
