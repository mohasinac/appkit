/**
 * Server-Side Error Logging Utilities
 *
 * Wraps the Logger singleton for use in API routes, server components, and
 * server actions. Attaches request metadata when a NextRequest is available.
 *
 * IMPORTANT: Only import this file in server-side code. For client-side code
 * use `client-logger.ts`.
 */

import { logger } from "../core";
import { AppError } from "../errors";
import { type NextRequest } from "next/server";

export interface ServerErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  [key: string]: unknown;
}

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
  logger.error(message, buildServerMeta(error, context));
};

export const logServerWarning = (
  message: string,
  data?: ServerErrorContext,
): void => {
  logger.warn(message, { ...data, timestamp: new Date().toISOString() });
};

export const logServerInfo = (
  message: string,
  data?: ServerErrorContext,
): void => {
  logger.info(message, { ...data, timestamp: new Date().toISOString() });
};

export const logServerDebug = (
  message: string,
  data?: ServerErrorContext,
): void => {
  logger.debug(message, { ...data, timestamp: new Date().toISOString() });
};
