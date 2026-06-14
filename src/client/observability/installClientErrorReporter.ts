"use client";

import * as React from "react";
import { reportClientError } from "./reportClientError";

let installed = false;

/**
 * Mount the window.onerror + window.onunhandledrejection listeners exactly once.
 * Designed to be called from `[locale]/layout.tsx` inside a "use client" effect.
 *
 * Multiple invocations are no-ops — the install guard ensures we never double-
 * install (e.g. across hot reloads or remounted layouts).
 */
export function installClientErrorReporter(): () => void {
  if (typeof window === "undefined") return () => {};
  if (installed) return () => {};
  installed = true;

  const onError = (event: ErrorEvent): void => {
    reportClientError({
      code: "CLIENT_WINDOW_ERROR",
      message: event.message ?? "Window error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  };

  const onUnhandled = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    reportClientError({
      code: "CLIENT_PROMISE_REJECTION",
      message:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandled);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandled);
    installed = false;
  };
}

/** React hook variant — mounts the reporter once and unmounts on unload. */
export function useClientErrorReporter(): void {
  React.useEffect(() => installClientErrorReporter(), []);
}
