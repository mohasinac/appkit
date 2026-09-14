/**
 * Record what the mailer decided, so the tester can assert on it without an inbox.
 *
 * ## Why this exists
 *
 * 21 checklist cases are about email. Reading a real mailbox over IMAP can answer
 * some of them, but it is the wrong instrument for most:
 *
 *   - **Six of them assert an email should NOT arrive** (kill switch spares staff,
 *     opt-out honoured, no employee blast, losing bidders get no mail). Over IMAP,
 *     "nothing arrived" is unprovable — you wait N seconds and hope, and a slow
 *     inbox is indistinguishable from a working suppression. Here it is one read.
 *   - Delivery latency makes every other case slow and flaky for no added truth:
 *     whether Resend accepted the handoff says nothing about whether the app made
 *     the right decision, which is what the cases are actually about.
 *
 * So this records the DECISION and its inputs. A real inbox is still the only
 * proof of real delivery, and the two or three cases that assert that keep using
 * one (`tester/scripts/lib/inbox.mjs`).
 *
 * ## Why here and not in `guardSend`
 *
 * `SendGuardContext` carries channel/feature/audience and deliberately no
 * recipient — the guard's own docstring explains it must not become the transport.
 * `sendEmail()` is the one place that holds the recipient, the rendered body AND
 * the guard's verdict, which is exactly the tuple a case needs.
 *
 * ## 🛑 Gated, because recording real people's mail is a privacy problem
 *
 * Recording recipients and bodies for actual users would be a new PII store with
 * no retention story. So this writes ONLY when the recipient is the harness
 * mailbox (`TESTER_EMAIL_ID`), or when `EMAIL_RECORDER_ALL` is explicitly set for
 * local debugging. Absent that env var, this function is a no-op and costs one
 * string comparison.
 *
 * Best-effort throughout: a recorder that can fail a send is worse than no
 * recorder, so every path swallows. Same discipline as `recordAdminAction`.
 *
 * @tag domain:notifications,tester
 * @tag layer:server
 * @tag access:server-only
 */

import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";
import { RTDB_PATHS } from "../../../providers/db-firebase/rtdb-paths";

/** Firestore collection holding the canonical record. */
export const EMAIL_EVENTS_COLLECTION = "emailEvents";

export type EmailSendOutcome = "sent" | "suppressed" | "failed";

export interface EmailSendRecord {
  /** Recipient(s), as passed to the provider. */
  to: string | string[];
  subject: string;
  /** `feature` from the guard — the notification type or named flow. */
  feature: string;
  audience: string;
  channel: string;
  outcome: EmailSendOutcome;
  /** Suppression reason (`admin_disabled`, `daily_ceiling`, …) or the error text. */
  reason?: string;
  /**
   * The rendered body. Recorded so a case can assert the email has a heading, a
   * lead line and a button rather than one bare paragraph — an assertion that is
   * otherwise only checkable by eye in a real client.
   */
  html?: string;
}

/** Normalise `to` for comparison and storage. */
function recipients(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
}

/**
 * Should this send be recorded at all?
 *
 * Exported so the audit and tests can exercise the gate directly rather than
 * inferring it from behaviour.
 */
export function shouldRecordSend(to: string | string[]): boolean {
  if (process.env.EMAIL_RECORDER_ALL === "true") return true;
  const mailbox = process.env.TESTER_EMAIL_ID?.trim().toLowerCase();
  if (!mailbox) return false;
  return recipients(to).includes(mailbox);
}

/**
 * Write the record. Never throws, never blocks the send.
 *
 * Firestore is canonical and RTDB is only a ping — the same split the messaging
 * feature already uses. The body does NOT go into RTDB: `bulk_events` is
 * uncapped and a newsletter CSV already goes there, which is the mistake not to
 * repeat on a channel that fires on every email.
 */
export async function recordSendAttempt(record: EmailSendRecord): Promise<void> {
  if (!shouldRecordSend(record.to)) return;

  try {
    const { getAdminDb } = await import("../../../providers/db-firebase/admin");
    const db = getAdminDb();
    const now = new Date();

    const doc = {
      to: recipients(record.to),
      subject: record.subject,
      feature: record.feature,
      audience: record.audience,
      channel: record.channel,
      outcome: record.outcome,
      reason: record.reason ?? null,
      html: record.html ?? null,
      createdAt: now,
    };

    const ref = await db.collection(EMAIL_EVENTS_COLLECTION).add(doc);

    /*
     * The ping. Tiny by design: an id, the outcome and the feature are enough for
     * a poller to know something happened and go read the Firestore row.
     * Best-effort separately from the write above — losing the ping costs a
     * poller one extra second, losing the record costs the case its evidence.
     */
    try {
      const { getAdminRealtimeDb } = await import("../../../providers/db-firebase/admin");
      await getAdminRealtimeDb()
        .ref(`${RTDB_PATHS.EMAIL_EVENTS}/${ref.id}`)
        .set({
          id: ref.id,
          feature: record.feature,
          outcome: record.outcome,
          at: now.toISOString(),
        });
    } catch (err) {
      // Deliberately unreported: the Firestore row above is the record, and it
      // already succeeded by the time this runs. Losing the ping costs a poller
      // one extra second of latency and loses no evidence, so logging it would
      // add noise to every transient RTDB blip for no recoverable information.
      void normalizeError(err);
    }
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.warn("recordSendAttempt: could not record email event", {
      feature: record.feature,
      outcome: record.outcome,
      message: n.message,
    });
  }
}
