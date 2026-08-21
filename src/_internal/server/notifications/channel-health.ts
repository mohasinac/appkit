/**
 * Circuit breaker for outbound notification channels (email, WhatsApp).
 *
 * Persisted as a singleton Firestore doc `system/channelHealth` so the
 * "is this channel currently known-bad" state survives across requests and
 * Firebase Function invocations — a channel that just failed 3 times in a
 * row is treated as down for a 15-minute cooldown instead of being retried
 * on every subsequent send attempt (wasted latency + hammering a dead
 * provider). After the cooldown, the next attempt is a half-open probe:
 * its own outcome decides whether the circuit re-closes or re-opens.
 */

import { getAdminDb } from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";

export type NotificationChannel = "email" | "whatsapp";

interface ChannelHealthState {
  consecutiveFailures: number;
  state: "closed" | "open" | "half_open";
  openedAt?: number;
}

const HEALTH_COLLECTION = "system";
const HEALTH_DOC = "channelHealth";
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 15 * 60 * 1000;
const RETRY_DELAYS_MS = [500, 1500];

function defaultState(): ChannelHealthState {
  return { consecutiveFailures: 0, state: "closed" };
}

async function readHealthDoc(): Promise<Partial<Record<NotificationChannel, ChannelHealthState>>> {
  try {
    const snap = await getAdminDb().collection(HEALTH_COLLECTION).doc(HEALTH_DOC).get();
    return (snap.data() as Partial<Record<NotificationChannel, ChannelHealthState>> | undefined) ?? {};
  } catch (err) {
    void normalizeError(err);
    return {};
  }
}

/**
 * Returns false only when the circuit is open and still within its cooldown
 * window. Any other state (closed, or open-but-cooldown-elapsed) is treated
 * as healthy — the latter lets the next call through as a half-open probe.
 */
export async function isChannelHealthy(channel: NotificationChannel): Promise<boolean> {
  const doc = await readHealthDoc();
  const state = doc[channel];
  if (!state || state.state !== "open") return true;
  if (state.openedAt && Date.now() - state.openedAt >= COOLDOWN_MS) return true;
  return false;
}

export async function recordChannelOutcome(channel: NotificationChannel, success: boolean): Promise<void> {
  try {
    const doc = await readHealthDoc();
    const prev = doc[channel] ?? defaultState();

    const next: ChannelHealthState = success
      ? defaultState()
      : (() => {
          const consecutiveFailures = prev.consecutiveFailures + 1;
          return consecutiveFailures >= FAILURE_THRESHOLD
            ? { consecutiveFailures, state: "open" as const, openedAt: Date.now() }
            : { consecutiveFailures, state: "closed" as const };
        })();

    await getAdminDb()
      .collection(HEALTH_COLLECTION)
      .doc(HEALTH_DOC)
      .set({ [channel]: next }, { merge: true });
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("channel-health: failed to record outcome", { channel, success });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn` up to 3 times (500ms then 1.5s between attempts) and records the
 * final outcome against the channel's health state. `fn` must throw on
 * failure — for a helper that returns a boolean instead (e.g. the WhatsApp
 * Cloud API helpers), convert `false` into a thrown error at the call site
 * before passing it in.
 */
export async function withChannelRetry<T>(
  channel: NotificationChannel,
  fn: () => Promise<T>,
): Promise<T> {
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  // Narrowed to Error at catch time rather than held as `unknown` — same
  // conversion the throw below used to do, just done once at the source so
  // `unknown` never escapes the catch clause (CLAUDE.md Root Cause #31).
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      await recordChannelOutcome(channel, true);
      return result;
    } catch (err) {
      void normalizeError(err);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        await delay(RETRY_DELAYS_MS[attempt - 1]);
      }
    }
  }

  await recordChannelOutcome(channel, false);
  throw lastError ?? new Error(`${channel} channel failed after ${maxAttempts} attempts`);
}
