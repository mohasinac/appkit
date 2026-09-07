/**
 * The daily send counter.
 *
 * One document per channel per calendar day. It exists because the only other
 * rate limiter in this codebase cannot do this job: `appkit/src/security/rate-limit.ts`
 * falls back to a module-scope `Map` when Upstash is unconfigured (it is), so
 * on Vercel the count is per-lambda-instance and resets on every cold start.
 * That is fine for "slow down this IP" and useless for "we have 100 of these
 * to spend today".
 *
 * Firestore is the only shared, durable counter this project already pays for.
 * The shape is copied deliberately from `SmsCounterDocument` — same
 * date-keyed-document, same transactional increment — because that pattern has
 * been in production on the OTP path and there is no reason to invent a second
 * one.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { MessageChannel } from "../../../_internal/shared/features/messaging/config";

/**
 * The document ID is `{channel}_{YYYY-MM-DD}` — composite rather than a
 * subcollection so the whole thing is one `.doc()` lookup with no query, no
 * index, and no fan-out. `id` itself comes from `BaseDocument`.
 */
export interface MessageBudgetDocument extends BaseDocument {
  channel: MessageChannel;
  /** Calendar date in the site's reporting timezone — YYYY-MM-DD. */
  date: string;
  /** Messages RESERVED today. Reserved, not delivered — see `reserveSend`. */
  count: number;
}

export const MESSAGE_BUDGET_COLLECTION = "messageBudget" as const;

export const MESSAGE_BUDGET_FIELDS = {
  CHANNEL: "channel",
  DATE: "date",
  COUNT: "count",
  UPDATED_AT: "updatedAt",
} as const;

/**
 * Cooldown ledger for the Firebase-side auth mails (password reset, email
 * verification), which never touch this app's server and so cannot be guarded
 * where the others are.
 *
 * 🛑 `id` is a HASH of the email address, never the address itself. This
 * collection is not PII-encrypted and does not need to be — the whole point is
 * that it stores no identity, only the fact that *something* asked recently.
 */
export interface AuthMailCooldownDocument extends BaseDocument {
  /** Document ID is `{purpose}_{hmac(email)}`; `id` comes from BaseDocument. */
  purpose: AuthMailPurpose;
  lastRequestedAt: Date;
}

export const AUTH_MAIL_COOLDOWN_COLLECTION = "authMailCooldowns" as const;

export const AUTH_MAIL_PURPOSE_VALUES = [
  "password_reset",
  "verify_email",
] as const;

export type AuthMailPurpose = (typeof AUTH_MAIL_PURPOSE_VALUES)[number];

/**
 * How long a given address must wait between requests of the same kind.
 *
 * 15 minutes matches the two cooldowns already in this codebase — the checkout
 * value OTP and the SMS OTP — so a user who hits two of them in one session
 * meets one consistent rule rather than three different ones.
 */
export const AUTH_MAIL_COOLDOWN_MS = 15 * 60 * 1000;
