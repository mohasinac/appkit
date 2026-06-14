"use client";

/**
 * Send a client-side error to the persisted log. POSTs `/api/client-errors`
 * fire-and-forget; never throws (errors inside the reporter are swallowed
 * so reporting itself can't break the boundary that called it).
 *
 * Dedupe: short rolling cache by hash of (code + message + topStack).
 * Garbage filter: skips errors whose stack comes only from browser extensions.
 */
export interface ClientErrorPayload {
  code: string;
  message: string;
  stack?: string;
  componentStack?: string;
  requestId?: string;
}

const SEEN = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5000;
const MAX_SEEN = 32;

function topFrame(stack?: string): string {
  if (!stack) return "";
  const lines = stack.split("\n").map((l) => l.trim());
  // First frame that isn't the error message line
  return lines.find((l) => l.startsWith("at ")) ?? "";
}

function looksLikeExtensionStack(stack?: string): boolean {
  if (!stack) return false;
  return /chrome-extension:|moz-extension:|safari-extension:/i.test(stack);
}

function hash(payload: ClientErrorPayload): string {
  return `${payload.code}|${payload.message}|${topFrame(payload.stack)}`;
}

function shouldSkipDuplicate(key: string): boolean {
  const now = Date.now();
  // Cull stale entries
  for (const [k, t] of SEEN) {
    if (now - t > DEDUPE_WINDOW_MS) SEEN.delete(k);
  }
  if (SEEN.has(key)) return true;
  if (SEEN.size >= MAX_SEEN) SEEN.delete(SEEN.keys().next().value as string);
  SEEN.set(key, now);
  return false;
}

export function reportClientError(payload: ClientErrorPayload): void {
  try {
    if (looksLikeExtensionStack(payload.stack)) return;
    const key = hash(payload);
    if (shouldSkipDuplicate(key)) return;

    const body = JSON.stringify({
      code: payload.code,
      message: payload.message,
      stack: payload.stack?.slice(0, 4096),
      componentStack: payload.componentStack?.slice(0, 4096),
      requestId: payload.requestId,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });

    // Prefer sendBeacon — survives navigation and never blocks the unload path.
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/client-errors", blob);
      return;
    }

    // Fallback to fetch keepalive
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow — reporting must never throw */
    });
  } catch {
    /* swallow — reporting must never throw */
  }
}
