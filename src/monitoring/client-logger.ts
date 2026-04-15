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

export const logApiError = async (
  endpoint: string,
  response: Response,
  context?: ClientErrorContext,
): Promise<void> => {
  let responseBody: unknown;

  try {
    responseBody = await response.clone().json();
  } catch {
    responseBody = await response.clone().text();
  }

  logClientError(`API Error: ${endpoint}`, new Error(response.statusText), {
    ...context,
    endpoint,
    status: response.status,
    statusText: response.statusText,
    responseBody,
  });
};

export const logValidationError = (
  formName: string,
  errors: Record<string, unknown>,
  context?: ClientErrorContext,
): void => {
  logClientWarning(`Form validation failed: ${formName}`, {
    ...context,
    formName,
    validationErrors: errors,
  });
};

export const logNavigationError = (
  route: string,
  error: unknown,
  context?: ClientErrorContext,
): void => {
  logClientError(`Navigation error to ${route}`, error, {
    ...context,
    route,
    type: "navigation",
  });
};

export const logAuthError = (
  operation: string,
  error: unknown,
  context?: ClientErrorContext,
): void => {
  logClientError(`Authentication error: ${operation}`, error, {
    ...context,
    operation,
    type: "authentication",
  });
};

export const logUploadError = (
  fileName: string,
  error: unknown,
  context?: ClientErrorContext,
): void => {
  logClientError(`File upload failed: ${fileName}`, error, {
    ...context,
    fileName,
    type: "upload",
  });
};

export const logPaymentError = (
  transactionId: string,
  error: unknown,
  context?: ClientErrorContext,
): void => {
  logClientError(`Payment error: ${transactionId}`, error, {
    ...context,
    transactionId,
    type: "payment",
  });
};

export const logApplicationError = (
  category: string,
  message: string,
  error: unknown,
  context?: ClientErrorContext,
): void => {
  logClientError(`[${category}] ${message}`, error, {
    ...context,
    category,
  });
};

let clientLoggerInitialized = false;

export const initializeClientLogger = (): void => {
  if (typeof window === "undefined" || clientLoggerInitialized) {
    return;
  }

  clientLoggerInitialized = true;

  window.addEventListener("unhandledrejection", (event) => {
    logClientError("Unhandled Promise Rejection", event.reason, {
      type: "unhandled-rejection",
    });
  });

  window.addEventListener("error", (event) => {
    logClientError("Global Error", event.error ?? event.message, {
      type: "global-error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
};
