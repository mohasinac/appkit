import "server-only";

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

import { appendFile, mkdir, readdir, rename, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { type NextRequest } from "next/server";
import { redactPii } from "../security";
import { AppError } from "../errors";

const LOGS_DIR = path.join(process.cwd(), "logs");
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024;
const MAX_LOG_FILES = 10;
const isFileLoggingEnabled = !process.env.VERCEL;

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

export interface ServerErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  [key: string]: unknown;
}

function serializeError(error: Error): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (error.stack) {
    serialized.stack = error.stack;
  }

  for (const [key, value] of Object.entries(error)) {
    serialized[key] = value;
  }

  return serialized;
}

function normalizeLogData(data: unknown): unknown {
  if (data instanceof Error) return serializeError(data);
  if (Array.isArray(data)) return data.map(normalizeLogData);
  if (data instanceof Date || data === null || data === undefined) return data;
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        normalizeLogData(value),
      ]),
    );
  }
  return data;
}

async function ensureLogsDir(): Promise<void> {
  if (!existsSync(LOGS_DIR)) {
    await mkdir(LOGS_DIR, { recursive: true });
  }
}

function getLogFilePath(level: LogLevel): string {
  const date = new Date().toISOString().split("T")[0];
  return path.join(LOGS_DIR, `${level}-${date}.log`);
}

function formatLogEntry(entry: LogEntry): string {
  const sanitized = entry.data ? redactPii(entry.data) : undefined;
  const dataStr = sanitized
    ? `\n  Data: ${JSON.stringify(sanitized, null, 2)}`
    : "";
  return `[${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}${dataStr}\n\n`;
}

async function cleanOldLogFiles(logsDir: string): Promise<void> {
  try {
    const files = await readdir(logsDir);
    const logFiles = files
      .filter((file) => file.endsWith(".log"))
      .map((file) => ({
        name: file,
        path: path.join(logsDir, file),
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
  } catch {
    // Logger failures must never break the request path.
  }
}

async function rotateLogFileIfNeeded(filePath: string): Promise<void> {
  try {
    if (!existsSync(filePath)) return;

    const fileStats = await stat(filePath);
    if (fileStats.size < MAX_LOG_FILE_SIZE) return;

    const timestamp = Date.now();
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, ".log");
    const rotatedPath = path.join(dir, `${filename}.${timestamp}.log`);

    await rename(filePath, rotatedPath);
    await cleanOldLogFiles(dir);
  } catch {
    // Logger failures must never break the request path.
  }
}

async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await ensureLogsDir();
    const filePath = getLogFilePath(entry.level);
    await rotateLogFileIfNeeded(filePath);
    await appendFile(filePath, formatLogEntry(entry));
  } catch (error) {
    console.error("Failed to write log:", error);
  }
}

export const serverLogger = {
  debug(message: string, data?: unknown): void {
    const sanitized = data ? redactPii(normalizeLogData(data)) : undefined;
    console.debug(`[DEBUG] ${message}`, sanitized);
  },

  info(message: string, data?: unknown): void {
    const sanitized = data ? redactPii(normalizeLogData(data)) : undefined;
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      data: sanitized,
    };
    console.info(`[INFO] ${message}`, sanitized);
    if (isFileLoggingEnabled) writeLog(entry).catch(() => {});
  },

  warn(message: string, data?: unknown): void {
    const sanitized = data ? redactPii(normalizeLogData(data)) : undefined;
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: new Date().toISOString(),
      data: sanitized,
    };
    console.warn(`[WARN] ${message}`, sanitized);
    if (isFileLoggingEnabled) writeLog(entry).catch(() => {});
  },

  error(message: string, data?: unknown): void {
    const sanitized = data ? redactPii(normalizeLogData(data)) : undefined;
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      data: sanitized,
    };
    console.error(`[ERROR] ${message}`, sanitized);
    if (isFileLoggingEnabled) writeLog(entry).catch(() => {});
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
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...context,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    base.error = {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      data: error.data,
    };
  } else if (error instanceof Error) {
    base.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else {
    base.error = error;
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
