/**
 * Client-Side Error Logging Utilities
 *
 * Wraps the Logger singleton for use in React components, client hooks, and
 * browser-only code. Automatically attaches timestamp, userAgent, and current URL.
 *
 * For server-side logging use `server-logger.ts`.
 */

import { logger } from "../core";
import { AppError } from "../errors";

export interface ClientErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

function buildClientMeta(
  error: unknown,
  context?: ClientErrorContext,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...context,
    timestamp: new Date().toISOString(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
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

export const logClientError = (
  message: string,
  error: unknown,
  context?: ClientErrorContext,
): void => {
  logger.error(message, buildClientMeta(error, context));
};

export const logClientWarning = (
  message: string,
  data?: ClientErrorContext,
): void => {
  logger.warn(message, { ...data, timestamp: new Date().toISOString() });
};

export const logClientInfo = (
  message: string,
  data?: ClientErrorContext,
): void => {
  logger.info(message, { ...data, timestamp: new Date().toISOString() });
};

export const logClientDebug = (
  message: string,
  data?: ClientErrorContext,
): void => {
  logger.debug(message, { ...data, timestamp: new Date().toISOString() });
};
