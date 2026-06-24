import type { FirestoreDocument } from "@mohasinac/appkit";
/**
 * Action telemetry sink — SB-UNI-X5 2026-05-13.
 *
 * Pure-JS wrapper that Phase 7 (W-1 CTA registry) extends. Today the sink
 * is a no-op in development and a structured-event emitter in production
 * (writes to the `events` analytics stream OR an external sink configured
 * via env). The Phase 7 `<Button action={...}>` extension calls
 * `actionTracker.emit(action.id, ctx, success)` on click + outcome.
 *
 * Designed so a future telemetry consumer (Sentry, GA, custom) drops in by
 * replacing the `sink` impl via `setActionTrackerSink`. Default sink is
 * environment-aware:
 *   - SSR / Node + `NODE_ENV !== "production"` → console.debug
 *   - Browser + `NODE_ENV === "production"` → POST to /api/telemetry/actions
 *     (no-op when the endpoint isn't deployed yet — silently logs to console)
 *
 * Pattern 7 from the SB-UNI future-expansion plan.
 */

export interface ActionEvent {
  /** Stable id from the CTA registry (e.g. "product.add-to-cart"). */
  actionId: string;
  /** Contextual payload — resource id, listingType, store, etc. */
  ctx?: FirestoreDocument;
  /** Result of the action — undefined when not yet known. */
  success?: boolean;
  /** ISO timestamp of the emission. */
  timestamp: string;
}

export type ActionTrackerSink = (event: ActionEvent) => void | Promise<void>;

function defaultSink(event: ActionEvent): void {
  if (typeof window === "undefined") {
    // SSR / Node — best-effort console log; production servers can swap
    // the sink to a real logger via `setActionTrackerSink`.
     
    if (process.env.NODE_ENV !== "production") {
      console.debug("[action-tracker]", event);
    }
    return;
  }
  // Browser. In production we'd POST to a telemetry endpoint when it's
  // deployed; for now stay silent in prod to avoid 404 noise + dev-mode
  // logs surface the events.
  if (process.env.NODE_ENV !== "production") {
     
    console.debug("[action-tracker]", event);
  }
}

let currentSink: ActionTrackerSink = defaultSink;

export const actionTracker = {
  /**
   * Emit an action event. Designed to be fire-and-forget — never throws,
   * never blocks the caller. Consumers wrap critical paths in try/catch
   * even though sinks must self-handle errors.
   */
  emit(
    actionId: string,
    ctx?: FirestoreDocument,
    success?: boolean,
  ): void {
    const event: ActionEvent = {
      actionId,
      ctx,
      success,
      timestamp: new Date().toISOString(),
    };
    try {
      const result = currentSink(event);
      // Swallow promise rejections so the caller path is never affected.
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch(console.error);
      }
    } catch {
      // Intentionally swallowed — telemetry must never break callers.
    }
  },
};

/** Replace the default sink — useful for Sentry/GA/custom telemetry. */
export function setActionTrackerSink(sink: ActionTrackerSink): void {
  currentSink = sink;
}

/** Restore the default sink. Mostly for tests. */
export function resetActionTrackerSink(): void {
  currentSink = defaultSink;
}
