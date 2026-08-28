export const SERVER_ERRORS_COLLECTION = "serverErrors";

/** Discriminator for which surface a recorded failure came from. */
export type ServerErrorSource = "vercel" | "client" | "function";

export type ServerErrorDocument = {
  id: string;
  /** Server timestamp; also acts as the TTL field (30d retention). */
  occurredAt: number;
  source: ServerErrorSource;
  /** HTTP route, function name, or client pathname depending on `source`. */
  route: string;
  /** HTTP method when applicable (vercel/client); undefined for `function`. */
  method?: string;
  userId?: string;
  /** Stable code from ERROR_DISPLAY_MAP / mapToHttpError. */
  code: string;
  message: string;
  /** Truncated stack (≤4 KB) — never the raw request body. */
  stack?: string;
  /**
   * Flattened `Error.cause` chain (≤4 KB), one `caused by: …` block per link.
   *
   * Load-bearing, not a nicety: every AppError in this codebase is a WRAP, and
   * `AppError` calls `Error.captureStackTrace(this, this.constructor)` — so
   * `stack` above begins at the catch block that did the wrapping and the
   * frames naming the real fault exist ONLY here.
   */
  cause?: string;
  /** React error boundary componentStack (client source only). */
  componentStack?: string;
  requestId: string;
  userAgent?: string;
  /** sha256(requestBody) — for diagnosis without leaking PII. */
  bodyDigest?: string;
}

export const SERVER_ERROR_FIELDS = {
  ID: "id",
  OCCURRED_AT: "occurredAt",
  SOURCE: "source",
  ROUTE: "route",
  METHOD: "method",
  USER_ID: "userId",
  CODE: "code",
  MESSAGE: "message",
  STACK: "stack",
  COMPONENT_STACK: "componentStack",
  REQUEST_ID: "requestId",
  USER_AGENT: "userAgent",
  BODY_DIGEST: "bodyDigest",
} as const;

export const SERVER_ERROR_STACK_MAX_BYTES = 4096;
export const SERVER_ERROR_RETENTION_DAYS = 30;
