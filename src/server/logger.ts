type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

type LogSink = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

type LoggerOptions = {
  sink?: LogSink;
  now?: () => Date;
};

export type Logger = ReturnType<typeof createLogger>;

export function createLogger({ sink = console, now = () => new Date() }: LoggerOptions = {}) {
  return {
    info(event: string, context: LogContext = {}) {
      sink.info(formatLog("info", event, now(), context));
    },
    warn(event: string, context: LogContext = {}) {
      sink.warn(formatLog("warn", event, now(), context));
    },
    error(event: string, error: unknown, context: LogContext = {}) {
      sink.error(formatLog("error", event, now(), { ...context, error: normalizeError(error) }));
    }
  };
}

export const logger = createLogger();

function formatLog(level: LogLevel, event: string, timestamp: Date, context: LogContext): string {
  return JSON.stringify({
    level,
    event,
    timestamp: timestamp.toISOString(),
    ...context
  });
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name
    };
  }

  return {
    message: String(error),
    name: "UnknownError"
  };
}
