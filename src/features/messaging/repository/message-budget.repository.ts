import { BaseRepository } from "../../../providers/db-firebase";
import {
  AUTH_MAIL_COOLDOWN_COLLECTION,
  AUTH_MAIL_COOLDOWN_MS,
  MESSAGE_BUDGET_COLLECTION,
  MESSAGE_BUDGET_FIELDS,
  type AuthMailCooldownDocument,
  type AuthMailPurpose,
  type MessageBudgetDocument,
} from "../schemas/firestore";
import type { MessageChannel } from "../../../_internal/shared/features/messaging/config";

/**
 * Reporting timezone for "which day is it". Fixed rather than server-local
 * because a Vercel lambda runs in UTC and a Firebase Function in whatever
 * region it was deployed to — two runtimes disagreeing about the date would
 * silently give the site two partial budgets around midnight IST.
 *
 * Matches the daily digest's own cron timezone, so "today" means the same
 * thing in the counter and in the report of the counter.
 */
const BUDGET_TIMEZONE = "Asia/Kolkata";

/**
 * `en-CA` because it formats as YYYY-MM-DD natively — the alternative is
 * hand-assembling parts from `formatToParts`, which is the same thing with
 * more places to get it wrong.
 */
export function budgetDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUDGET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export class MessageBudgetRepository extends BaseRepository<MessageBudgetDocument> {
  constructor() {
    super(MESSAGE_BUDGET_COLLECTION);
  }

  /**
   * Claim one unit of today's allowance for `channel`.
   *
   * ## Reserve-then-send, on purpose
   *
   * The unit is consumed BEFORE the provider call, so a send that then fails
   * still costs the budget. That is the conservative direction and it is the
   * right one here: on an 80/day allowance, over-counting means we stop a
   * little early, while under-counting means the provider starts rejecting and
   * every subsequent message — including the transactional ones — is lost.
   *
   * There is deliberately no `release()`. A failing channel is already handled
   * one layer up by the circuit breaker in
   * `_internal/server/notifications/channel-health.ts`, which halts the channel
   * after 3 failures; adding a compensating decrement here would mean a
   * partially-failed send could double-refund, which is exactly the kind of
   * subtle accounting bug a quota guard must not have.
   *
   * ## Why a single document and not a sharded counter
   *
   * Firestore sustains roughly one write per second on one document, so a
   * concurrent burst would contend. There is no such burst left: the
   * `EMAIL_ELIGIBLE_TYPES` gate in `sendNotification` returns before this
   * function is ever reached for the two fan-outs that had one (`bid_lost`,
   * 50-way, and the old scam-report employee blast, 100-way), and every
   * remaining email-eligible caller loops sequentially with `await`.
   *
   * 🛑 If a concurrent fan-out of an email-ELIGIBLE type is ever added —
   * `Promise.all`/`Promise.allSettled` over sends is the tell — this must be
   * sharded before it merges. `scripts/audit-unguarded-send.mjs` fails the
   * build on that pattern precisely so the decision cannot be made by
   * accident.
   */
  async reserveSend(
    channel: MessageChannel,
    ceiling: number,
    now: Date = new Date(),
  ): Promise<{ allowed: boolean; count: number; ceiling: number }> {
    const date = budgetDateString(now);
    const docRef = this.db.collection(this.collection).doc(`${channel}_${date}`);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const current: number = snap.exists
        ? ((snap.data()?.[MESSAGE_BUDGET_FIELDS.COUNT] as number) ?? 0)
        : 0;

      if (current >= ceiling) {
        return { allowed: false, count: current, ceiling };
      }

      const next = current + 1;
      tx.set(
        docRef,
        {
          [MESSAGE_BUDGET_FIELDS.CHANNEL]: channel,
          [MESSAGE_BUDGET_FIELDS.DATE]: date,
          [MESSAGE_BUDGET_FIELDS.COUNT]: next,
          [MESSAGE_BUDGET_FIELDS.UPDATED_AT]: now,
        },
        { merge: true },
      );

      return { allowed: true, count: next, ceiling };
    });
  }

  /** Read-only, for the daily digest. Never creates the document. */
  async getCount(channel: MessageChannel, now: Date = new Date()): Promise<number> {
    const snap = await this.db
      .collection(this.collection)
      .doc(`${channel}_${budgetDateString(now)}`)
      .get();
    return snap.exists
      ? ((snap.data()?.[MESSAGE_BUDGET_FIELDS.COUNT] as number) ?? 0)
      : 0;
  }
}

export class AuthMailCooldownRepository extends BaseRepository<AuthMailCooldownDocument> {
  constructor() {
    super(AUTH_MAIL_COOLDOWN_COLLECTION);
  }

  /**
   * Has this address already asked for this kind of mail recently?
   *
   * 🛑 `emailHash` must already be hashed by the caller — this function never
   * sees a real address, and the collection stores none. Passing a plaintext
   * email here would put an unencrypted identity into a collection with no PII
   * handling, which is exactly the leak `SUPPORT_TICKET_PII_FIELDS` and
   * friends exist to prevent.
   *
   * Transactional check-and-set rather than read-then-write: two tabs hitting
   * "resend" at once must not both pass.
   */
  async checkAndSet(
    purpose: AuthMailPurpose,
    emailHash: string,
    now: Date = new Date(),
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const docRef = this.db
      .collection(this.collection)
      .doc(`${purpose}_${emailHash}`);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const lastRequestedAt: Date | null = snap.exists
        ? (snap.data()?.lastRequestedAt?.toDate?.() ?? null)
        : null;

      // `Infinity` when there is no prior request, so the single comparison
      // below covers both "never asked" and "asked long enough ago" — flatter
      // than nesting the null check around the elapsed check.
      const elapsed = lastRequestedAt
        ? now.getTime() - lastRequestedAt.getTime()
        : Number.POSITIVE_INFINITY;

      if (elapsed < AUTH_MAIL_COOLDOWN_MS) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((AUTH_MAIL_COOLDOWN_MS - elapsed) / 1000),
        };
      }

      tx.set(docRef, { purpose, lastRequestedAt: now }, { merge: true });
      return { allowed: true, retryAfterSeconds: 0 };
    });
  }
}

export const messageBudgetRepository = new MessageBudgetRepository();
export const authMailCooldownRepository = new AuthMailCooldownRepository();
