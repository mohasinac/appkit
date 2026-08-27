import { normalizeError } from "../errors/normalize";
import type { FirestoreValue, JsonValue } from "../schemas/types";
/**
 * Server-Side Error Logging Utilities
 *
 * Shared logger for API routes, server components, and server actions.
 * Attaches request metadata when a NextRequest is available and writes
 * structured log files in local environments.
 *
 * IMPORTANT: Only import this file in server-side code. For client-side code
 * use `client-logger.ts`.
 */

import { type NextRequest } from "next/server";
import { redactPii } from "../security/pii-redact";
import { AppError } from "../errors";

// fs/path are Node.js built-ins that must NOT be imported at the top level.
// Doing so causes Next.js Edge bundler warnings because this file is reachable
// from the instrumentation hook, which is compiled for both Edge and Node.
// Using require() calls inside functions keeps the imports out of the static
// analysis graph and prevents Edge Runtime warnings.
 
 
function nodeRequire(id: string): any { return require(id); }
function nodeFsPromises(): typeof import("fs/promises") { return nodeRequire("fs/promises"); }
function nodeFs(): typeof import("fs") { return nodeRequire("fs"); }
function nodePath(): typeof import("path") { return nodeRequire("path"); }
// process.cwd() is a Node.js-only API. Access it through module.require so
// Next.js Edge static analysis does not flag this file.
 
function nodeCwd(): string { return (module as any).require("process").cwd(); }
 

function getLogsDir(): string {
  return nodePath().join(nodeCwd(), "logs");
}

const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024;
const MAX_LOG_FILES = 10;
/**
 * File logging is OPT-IN, not "anywhere that isn't Vercel".
 *
 * This was `!process.env.VERCEL`, which is `true` inside Cloud Functions — where
 * `VERCEL` is simply unset and the filesystem is read-only. Every log line in
 * every Function therefore ran mkdir/stat/appendFile, failed, and emitted a
 * SECOND line carrying the EROFS stack: every Function log doubled, plus four
 * wasted syscalls per line, against a log buffer that drops at ~4 KB/s
 * (CLAUDE.md Rule #6).
 *
 * Serverless runtimes have no durable disk and their stdout is already
 * collected, so the only place local files help is a developer machine.
 * `LOG_TO_FILE=1` turns it on there; nothing else does.
 */
const isServerlessRuntime = Boolean(
  process.env.VERCEL ||
    process.env.FUNCTION_TARGET || // Cloud Functions (2nd gen)
    process.env.K_SERVICE || // Cloud Run / Functions
    process.env.FUNCTIONS_EMULATOR ||
    process.env.AWS_LAMBDA_FUNCTION_NAME,
);
const isFileLoggingEnabled =
  process.env.LOG_TO_FILE === "1" && !isServerlessRuntime;

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: FirestoreValue;
}

export interface ServerErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  [key: string]: FirestoreValue;
}

function serializeError(error: Error): Record<string, FirestoreValue> {
  const serialized: Record<string, FirestoreValue> = {
    name: error.name,
    message: error.message,
  };

  if (error.stack) {
    serialized.stack = error.stack;
  }

  for (const [key, value] of Object.entries(error)) {
    // Error custom properties are serialised via normalizeLogData downstream;
    // FirestoreValue admits Date and JsonValue. Non-conforming values are
    // dropped to "[unserializable]" placeholder.
    serialized[key] =
      value === null || value === undefined ||
      typeof value === "string" || typeof value === "number" ||
      typeof value === "boolean" || value instanceof Date
        ? value
        : (JSON.stringify(value) as string);
  }

  return serialized;
}

// log-data payloads (Error, Date, primitive, object). Output is bounded by the
// downstream JSON-stringify contract.
function normalizeLogData(data: unknown): FirestoreValue {
  if (data instanceof Error) return serializeError(data) as FirestoreValue;
  if (Array.isArray(data)) return data.map(normalizeLogData) as FirestoreValue;
  if (data instanceof Date || data === null || data === undefined) return data;
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        normalizeLogData(value),
      ]),
    ) as FirestoreValue;
  }
  return data as FirestoreValue;
}

async function ensureLogsDir(): Promise<void> {
  const logsDir = getLogsDir();
  if (!nodeFs().existsSync(logsDir)) {
    await nodeFsPromises().mkdir(logsDir, { recursive: true });
  }
}

function getLogFilePath(level: LogLevel): string {
  const date = new Date().toISOString().split("T")[0];
  return nodePath().join(getLogsDir(), `${level}-${date}.log`);
}

function formatLogEntry(entry: LogEntry): string {
  const sanitized = entry.data ? redactPii(entry.data) : undefined;
  let dataStr = "";
  if (sanitized !== undefined) {
    try {
      dataStr = `\n Data: ${JSON.stringify(sanitized, null, 2)}`;
    } catch (_err) {
      void normalizeError(_err);
      dataStr = `\n Data: [non-serializable — ${typeof sanitized}]`;
    }
  }
  return `[${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}${dataStr}\n\n`;
}

async function cleanOldLogFiles(logsDir: string): Promise<void> {
  try {
    const { readdir, stat, unlink } = nodeFsPromises();
    const files = await readdir(logsDir);
    const logFiles = files
      .filter((file) => file.endsWith(".log"))
      .map((file) => ({
        name: file,
        path: nodePath().join(logsDir, file),
      }));

    if (logFiles.length <= MAX_LOG_FILES) return;

    const filesWithStats = await Promise.all(
      logFiles.map(async (file) => ({
        ...file,
        mtime: (await stat(file.path)).mtime,
      })),
    );

    filesWithStats.sort(
      (left, right) => left.mtime.getTime() - right.mtime.getTime(),
    );
    const filesToDelete = filesWithStats.slice(
      0,
      filesWithStats.length - MAX_LOG_FILES,
    );
    await Promise.all(filesToDelete.map((file) => unlink(file.path)));
  } catch (_err) {
    void normalizeError(_err); // Logger failures must never break the request path
  }
}

async function rotateLogFileIfNeeded(filePath: string): Promise<void> {
  try {
    if (!nodeFs().existsSync(filePath)) return;

    const { stat, rename } = nodeFsPromises();
    const fileStats = await stat(filePath);
    if (fileStats.size < MAX_LOG_FILE_SIZE) return;

    const timestamp = Date.now();
    const dir = nodePath().dirname(filePath);
    const filename = nodePath().basename(filePath, ".log");
    const rotatedPath = nodePath().join(dir, `${filename}.${timestamp}.log`);

    await rename(filePath, rotatedPath);
    await cleanOldLogFiles(dir);
  } catch (_err) {
    void normalizeError(_err); // Logger failures must never break the request path
  }
}

async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await ensureLogsDir();
    const filePath = getLogFilePath(entry.level);
    await rotateLogFileIfNeeded(filePath);
    await nodeFsPromises().appendFile(filePath, formatLogEntry(entry));
  } catch (error) {
    void normalizeError(error);
    console.error("Failed to write log:", error);
  }
}

/**
 * Cloud Logging severity names. GCP parses a JSON stdout line and promotes
 * `severity` into the real log level; a plain `[INFO] msg` string arrives as
 * unparsed `DEFAULT`-severity text, which is what every appkit server log has
 * been doing — invisible to any severity filter or alert.
 */
const GCP_SEVERITY: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
};

/**
 * Emit one line. Structured JSON where a collector is reading stdout
 * (Vercel/Cloud Functions/Cloud Run), human-readable locally.
 */
function emit(level: LogLevel, message: string, sanitized: unknown): void {
  const consoleFn =
    level === "error" ? console.error : level === "warn" ? console.warn : level === "debug" ? console.debug : console.info;

  if (isServerlessRuntime) {
    consoleFn(
      JSON.stringify({
        severity: GCP_SEVERITY[level],
        message,
        timestamp: new Date().toISOString(),
        ...(sanitized !== undefined ? { data: sanitized } : {}),
      }),
    );
    return;
  }

  consoleFn(`[${level.toUpperCase()}] ${message}`, sanitized);
}

function record(level: LogLevel, message: string, data?: unknown): void {
  const sanitized = data ? redactPii(normalizeLogData(data)) : undefined;
  emit(level, message, sanitized);
  if (isFileLoggingEnabled) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: sanitized as FirestoreValue,
    };
    writeLog(entry).catch((err) => {
      // stderr, not the logger — a logger that logs its own failure through
      // itself recurses. normalizeError is pure classification, so it is safe
      // to call here.
      process.stderr.write(`log write failed: ${normalizeError(err).message}\n`);
    });
  }
}

export const serverLogger = {
  debug(message: string, data?: unknown): void {
    record("debug", message, data);
  },

  info(message: string, data?: unknown): void {
    record("info", message, data);
  },

  warn(message: string, data?: unknown): void {
    record("warn", message, data);
  },

  error(message: string, data?: unknown): void {
    record("error", message, data);
  },
};

/** Pull the commonly needed headers from a NextRequest in one call. */
export const extractRequestMetadata = (request: NextRequest) => ({
  method: request.method,
  url: request.url,
  userAgent: request.headers.get("user-agent") ?? "unknown",
  ip:
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown",
  referer: request.headers.get("referer") ?? "none",
});

function buildServerMeta(
  error: unknown,
  context?: ServerErrorContext,
): Record<string, FirestoreValue> {
  const base: Record<string, FirestoreValue> = {
    ...(context as Record<string, FirestoreValue> | undefined),
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    base.error = {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      data: error.data === undefined || error.data === null
        ? null
        : (JSON.parse(JSON.stringify(error.data)) as JsonValue),
    };
  } else if (error instanceof Error) {
    base.error = {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  } else {
    base.error = typeof error === "string" || typeof error === "number" ||
      typeof error === "boolean" || error === null || error === undefined
      ? (error as FirestoreValue)
      : (JSON.stringify(error) as string);
  }

  return base;
}

export const logServerError = (
  message: string,
  error: unknown,
  context?: ServerErrorContext,
): void => {
  serverLogger.error(message, buildServerMeta(error, context));
};

export const logServerWarning = (
  message: string,
  data?: ServerErrorContext,
): void => {
  serverLogger.warn(message, { ...data, timestamp: new Date().toISOString() });
};

export const logServerInfo = (
  message: string,
  data?: ServerErrorContext,
): void => {
  serverLogger.info(message, { ...data, timestamp: new Date().toISOString() });
};

export const logServerDebug = (
  message: string,
  data?: ServerErrorContext,
): void => {
  serverLogger.debug(message, { ...data, timestamp: new Date().toISOString() });
};

export const logApiRouteError = (
  endpoint: string,
  error: unknown,
  request?: NextRequest,
  context?: ServerErrorContext,
): void => {
  logServerError(`API Route Error: ${endpoint}`, error, {
    ...context,
    endpoint,
    ...(request ? extractRequestMetadata(request) : {}),
  });
};

export const logDatabaseError = (
  operation: string,
  collection: string,
  error: unknown,
  context?: ServerErrorContext,
): void => {
  logServerError(`Database Error: ${operation} on ${collection}`, error, {
    ...context,
    operation,
    collection,
    type: "database",
  });
};

export const logServerAuthError = (
  operation: string,
  error: unknown,
  context?: ServerErrorContext,
): void => {
  logServerError(`Authentication Error: ${operation}`, error, {
    ...context,
    operation,
    type: "authentication",
  });
};

export const logAuthorizationError = (
  userId: string,
  resource: string,
  action: string,
  context?: ServerErrorContext,
): void => {
  logServerWarning(
    `Authorization Failed: User ${userId} attempted ${action} on ${resource}`,
    {
      ...context,
      userId,
      resource,
      action,
      type: "authorization",
    },
  );
};

export const logEmailError = (
  recipient: string,
  error: unknown,
  context?: ServerErrorContext,
): void => {
  logServerError(`Email Send Failed to ${recipient}`, error, {
    ...context,
    recipient,
    type: "email",
  });
};

export const logStorageError = (
  operation: string,
  filePath: string,
  error: unknown,
  context?: ServerErrorContext,
): void => {
  logServerError(`Storage Error: ${operation} on ${filePath}`, error, {
    ...context,
    operation,
    filePath,
    type: "storage",
  });
};

export const logExternalApiError = (
  serviceName: string,
  endpoint: string,
  error: unknown,
  context?: ServerErrorContext,
): void => {
  logServerError(`External API Error: ${serviceName} - ${endpoint}`, error, {
    ...context,
    serviceName,
    endpoint,
    type: "external-api",
  });
};

export const logSlowOperation = (
  operation: string,
  duration: number,
  threshold: number = 1000,
  context?: ServerErrorContext,
): void => {
  if (duration <= threshold) {
    return;
  }

  logServerWarning(`Slow Operation: ${operation} took ${duration}ms`, {
    ...context,
    operation,
    duration,
    threshold,
    type: "performance",
  });
};

export const logSecurityEvent = (
  event: string,
  severity: "info" | "warn" | "error",
  context?: ServerErrorContext,
): void => {
  const message = `Security Event: ${event}`;
  const fullContext = {
    ...context,
    event,
    type: "security",
  };

  if (severity === "error") {
    serverLogger.error(message, fullContext);
    return;
  }

  if (severity === "warn") {
    serverLogger.warn(message, fullContext);
    return;
  }

  serverLogger.info(message, fullContext);
};
