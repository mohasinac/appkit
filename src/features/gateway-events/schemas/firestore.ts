/**
 * `gatewayEvents` — the durable inbox for every payment-gateway webhook.
 *
 * ## Why this collection exists
 *
 * Before it, a webhook was a request and nothing else. If the handler threw, or
 * the Lambda died mid-dispatch, or the event type was one we had not written a
 * `case` for, **the event was gone** — there was no record it had ever arrived.
 * That is what made the 2026-10-21 incident undiagnosable (₹2,511.80 captured,
 * no order, a manual refund): the only trace was a `serverLogger.warn` in a log
 * buffer that drops at ~4 KB/s, and a Server Action's throw never reaches
 * `onRequestError` because `wrapAction` returns rather than throws
 * (Root Cause #87).
 *
 * The inbox inverts that. Persist, then act, then ack — so a crash leaves a row
 * with an expired lease that a reconciler finds within 5 minutes, instead of
 * leaving nothing at all.
 *
 * ## The name
 *
 * 🛑 Not `paymentEvents` — that collides with `RTDB_PATHS.PAYMENT_EVENTS`, a
 * short-lived Realtime Database signal channel that is a completely different
 * thing (a browser-facing ping, pruned every 15 minutes). Not `disputes` or
 * `incidents` either: both names are taken, by a buyer-contests-auto-approval
 * flow and a `scammerProfiles` subcollection respectively.
 *
 * ## Dedupe: the document id IS the key
 *
 * `${gateway}_${providerEventId ?? bodySha256.slice(0,32)}`, written with
 * Firestore's `.create()`, which **fails if the document exists**. That is the
 * same at-most-once primitive `gatewayOrderClaims` and `refundClaims` already
 * use, and it needs no transaction and no read.
 *
 * 🛑 **The `bodySha256` fallback is load-bearing, not a nicety.** Razorpay
 * sends `x-razorpay-event-id` and it is believed stable across redeliveries —
 * but that has NOT been verified against a live delivery, and verifying it
 * needs a real webhook. So the fallback means a missing or unstable header
 * degrades to body-identity dedupe rather than to *no* dedupe. PhonePe needs
 * that branch regardless: it documents no event id, and its bodies carry
 * `merchantOrderId` + `state`, so two identical bodies genuinely are the same
 * logical transition.
 *
 * ## Write amplification
 *
 * 2 writes + 0 reads for a new event; 1 failed create for a duplicate. At 100
 * events/day that is ~1% of the free daily write budget.
 *
 * 🛑 **Do not "optimise" this with an allowlist of event types that get a
 * durable row.** That reintroduces the exact gap this collection closes — the
 * unhandled event is the one you most want a record of, because it is the one
 * no code path is watching. The correct lever for volume is unsubscribing
 * unwanted types in the gateway's own dashboard.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { FirestoreDocument } from "../../../schemas/types";

export const GATEWAY_EVENTS_COLLECTION = "gatewayEvents";

/**
 * What the event is about, with the gateway's vocabulary already resolved.
 *
 * Deliberately the same five values the webhook route's own `NormalisedEvent`
 * uses, so the route classifies once and both the inbox and the dispatcher read
 * the same answer. `"dispute"` and `"refund"` have no producer until Phase 3
 * widens `normaliseRazorpayEvent` — they are declared here first **on purpose**:
 * a `payment.dispute.created` arriving today lands as `kind: "other"` with its
 * `rawEvent` intact and is therefore recoverable, rather than vanishing.
 */
export type GatewayEventKind = "paid" | "failed" | "dispute" | "refund" | "other";

/**
 * Lifecycle. Every value is reachable and each means something distinct:
 *
 * | value        | meaning |
 * |---|---|
 * | `received`   | persisted and claimed; dispatch has not returned yet |
 * | `processing` | re-dispatched by the stuck-event sweep (attempt ≥ 2) |
 * | `processed`  | the handler succeeded |
 * | `ignored`    | an event type we do not handle — recorded verbatim, not dropped |
 * | `conflict`   | a LATE event whose transition would regress the order |
 * | `failed`     | the handler threw; `terminal` says whether a retry can help |
 *
 * 🛑 `conflict` is not an error state. A late `order.paid` arriving after the
 * order shipped is not *wrong*, it is *out of date* — and asking the gateway to
 * retry a regression it can never win is the pathology the webhook route's own
 * header warns about. It acks 200 and records the conflict for a human.
 */
export type GatewayEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "ignored"
  | "conflict"
  | "failed";

export interface GatewayEventDocument extends BaseDocument {
  /** `payment.name` — "razorpay" | "phonepe" | "manual". */
  gateway: string;
  /** The gateway's own event string, verbatim, e.g. `payment.dispute.created`. */
  rawEvent: string;
  kind: GatewayEventKind;
  status: GatewayEventStatus;
  /**
   * Set with `status: "failed"` to mean "a retry cannot help" — a 4xx-class
   * fault, a validation refusal, an exhausted attempt budget. Absent means
   * unknown, which the sweep treats as retryable.
   */
  terminal?: boolean;
  /** `x-razorpay-event-id` when the gateway sent one. Absent for PhonePe. */
  providerEventId?: string;
  /**
   * sha256 of the raw body. Always present, even when `providerEventId` is —
   * it is the dedupe fallback AND the integrity check that survives payload
   * redaction, so the row can prove what arrived without storing it.
   */
  bodySha256: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  /**
   * Decimal RUPEES, never subunits. Converted at the provider boundary with
   * `paiseToRupees` — `audit-money-units` blocks both the raw arithmetic and
   * the word for the subunit appearing in a comment or a label.
   */
  amount?: number;
  /**
   * The reconciliation join key: which of OUR orders this event produced or
   * concerns. Empty on an `ignored` row and on a `failed` one that never got
   * far enough to place anything.
   */
  orderIds?: string[];
  receivedAt: Date;
  /**
   * 🛑 `claimedAt`, `leaseExpiresAt` and `expiresAt` are all REQUIRED, and that
   * is a correctness requirement rather than tidiness — Root Cause #100.
   *
   * The stuck-event sweep queries `leaseExpiresAt < now`, and the retention
   * sweep queries `expiresAt < now`. **A Firestore inequality excludes every
   * document that LACKS the field**, so an optional lease would make the
   * detector structurally unable to see exactly the rows it exists to find:
   * an event that crashed before claiming would be invisible to the thing
   * watching for events that crashed. Same for retention — an optional
   * `expiresAt` means rows that accumulate forever while the sweep reports
   * success.
   *
   * The create therefore always sets all three. There is no "unclaimed" state.
   */
  claimedAt: Date;
  leaseExpiresAt: Date;
  processedAt?: Date;
  /** 1 on create; incremented by each re-dispatch. */
  attempts: number;
  /** Truncated. Never the raw body — that is what `bodySha256` is for. */
  lastError?: string;
  /** Retention anchor. 90 days — see `GATEWAY_EVENT_RETENTION_DAYS`. */
  expiresAt: Date;
  /**
   * A REDACTED projection of the body, never the body itself.
   *
   * Razorpay payment entities carry `email`, `contact`, `card.last4`, `vpa` and
   * `bank`. `redactGatewayPayload` strips those recursively and caps the
   * result; `bodySha256` preserves integrity regardless, so nothing is lost
   * that a diagnosis actually needs.
   */
  payload?: FirestoreDocument;
  /** True when redaction hit the size cap, so a reader knows it is partial. */
  payloadTruncated?: boolean;
}

export const GATEWAY_EVENT_FIELDS = {
  ID: "id",
  GATEWAY: "gateway",
  RAW_EVENT: "rawEvent",
  KIND: "kind",
  STATUS: "status",
  TERMINAL: "terminal",
  PROVIDER_EVENT_ID: "providerEventId",
  BODY_SHA256: "bodySha256",
  GATEWAY_ORDER_ID: "gatewayOrderId",
  GATEWAY_PAYMENT_ID: "gatewayPaymentId",
  AMOUNT: "amount",
  ORDER_IDS: "orderIds",
  RECEIVED_AT: "receivedAt",
  CLAIMED_AT: "claimedAt",
  LEASE_EXPIRES_AT: "leaseExpiresAt",
  PROCESSED_AT: "processedAt",
  ATTEMPTS: "attempts",
  LAST_ERROR: "lastError",
  EXPIRES_AT: "expiresAt",
} as const;

/**
 * 90 days, deliberately longer than `serverErrors`' 30.
 *
 * A chargeback can arrive 120+ days after the payment it concerns, and the
 * first thing anyone wants then is the original `order.paid` event. 90 days
 * does not cover the full chargeback horizon — nothing short of indefinite
 * would — but it covers the window in which an event is still the cheapest way
 * to answer "what did the gateway actually tell us", and a row referenced by an
 * open case is excluded from the sweep regardless.
 */
export const GATEWAY_EVENT_RETENTION_DAYS = 90;

/**
 * How long a dispatch may hold its claim before the stuck-event sweep assumes
 * the worker died.
 *
 * 🛑 Must exceed the route's own `maxDuration` (60s), or the sweep re-dispatches
 * an event that is still legitimately in flight — which, for a `paid` event,
 * means two concurrent order placements. The placement claim makes that a no-op
 * rather than a double order, but relying on a downstream guard to cover a
 * timing bug we chose is the wrong order of defences.
 */
export const GATEWAY_EVENT_LEASE_SECONDS = 120;

/** Attempts after which the sweep stops re-dispatching and opens a case. */
export const GATEWAY_EVENT_MAX_ATTEMPTS = 5;

/** Byte budget for the redacted payload. */
export const GATEWAY_EVENT_PAYLOAD_MAX_BYTES = 32_768;

/** Byte budget for `lastError`. */
export const GATEWAY_EVENT_ERROR_MAX_BYTES = 2048;

/**
 * Build the dedupe id. Exported so the route, the ingest helper and any future
 * reconciler all derive it the same way — two spellings of a dedupe key is a
 * dedupe that silently does not work.
 *
 * `providerEventId` is preferred because it is stable across redeliveries of
 * the SAME event even when the body is re-serialised; the digest is the
 * fallback. Both are prefixed with the gateway so two providers cannot collide
 * on a shared id format.
 */
export function createGatewayEventId(
  gateway: string,
  providerEventId: string | undefined,
  bodySha256: string,
): string {
  const key = providerEventId?.trim() || bodySha256.slice(0, 32);
  /*
   * Firestore ids may not contain "/" and must not be "." or "..". A gateway
   * name is ours and safe, but a provider event id is THEIRS — so it is
   * sanitised rather than trusted. Anything outside the safe set collapses to
   * "_", which can at worst merge two events that differ only by an unsafe
   * character; that is strictly better than a write that throws on the one
   * path whose whole job is to not lose the event.
   */
  return `${gateway}_${key}`.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 1500);
}
