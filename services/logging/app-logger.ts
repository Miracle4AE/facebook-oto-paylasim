type LogLevel = "info" | "warn" | "error";

export type AppLogContext = Record<string, string | number | boolean | null | undefined>;

function serializeError(error: Error): Record<string, string | undefined> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function writeLine(level: LogLevel, event: string, context: AppLogContext, error?: Error) {
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  if (error) {
    record.error = serializeError(error);
  }
  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const appLogger = {
  info(event: string, context: AppLogContext = {}) {
    writeLine("info", event, context);
  },
  warn(event: string, context: AppLogContext = {}, error?: Error) {
    writeLine("warn", event, context, error);
  },
  error(event: string, context: AppLogContext = {}, error?: Error) {
    writeLine("error", event, context, error);
  },
};
