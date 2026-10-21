/**
 * The gateway-event inbox: persist, then act, then ack.
 *
 * ## The ordering, and why it is this way round
 *
 * ```
 *   verify signature          ← already done by the route, see below
 *   parse + normalise
 *   ingestGatewayEvent()      ← 1 write: persist AND claim, atomically
 *   dispatch                  ← place the order / signal RTDB / nothing
 *   settleGatewayEvent()      ← 1 write: the outcome
 *   ack
 * ```
 *
 * Total cost: 2 writes, 0 reads for a new event; 1 failed create for a
 * duplicate. ~80 ms against the route's 60,000 ms budget.
 *
 * 🛑 **Ingest MUST sit below the signature check**, and the webhook route
 * carries a comment saying so at the rejection branch. An unauthenticated
 * caller who can create Firestore documents by POSTing garbage is a write-quota
 * denial-of-service with no authentication at all — on the one route in the
 * application that accepts requests with no session. Persist after
 * authentication, never before.
 *
 * ## What a crash leaves behind
 *
 * A row with `status: "received"` and a lease that expires in 120 s. That is
 * the entire point: the 2026-10-21 incident left *nothing*, so there was no
 * artefact to reconcile against and the first signal was a customer asking
 * where their order was. Phase 4's R1 sweep queries exactly that shape every
 * 5 minutes.
 */

/*
 * 🛑 `"crypto"`, NOT `"node:crypto"` — Root Cause #24. A top-level
 * `node:`-prefixed import in any file reachable from `index.ts` or `client.ts`
 * through ANY re-export chain hard-fails the Turbopack production build with
 * `the chunking context (unknown) does not support external modules`, on every
 * page, in production only. `next dev` tolerates it, so the mistake ships.
 *
 * This file is server-only today and so would probably survive the prefixed
 * form — but "probably, today" is how that bug arrived the first time, and the
 * bare specifier costs nothing. `refunds/actions.ts` uses the same spelling for
 * the same reason.
 */
import { createHash } from "crypto";

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import {
  gatewayEventsRepository,
  type GatewayEventClaimResult,
} from "../../../../features/gateway-events/repository/gateway-events.repository";
import {
  GATEWAY_EVENT_MAX_ATTEMPTS,
  type GatewayEventKind,
  type GatewayEventStatus,
} from "../../../../features/gateway-events/schemas/firestore";
import { redactGatewayPayload } from "./redact";

export interface IngestGatewayEventInput {
  /** `payment.name` — the provider that signed this delivery. */
  gateway: string;
  /** The raw request body, verbatim — the same string the signature covered. */
  rawBody: string;
  /** The parsed body. Passed in rather than re-parsed, so there is one parse. */
  body: unknown;
  /** The gateway's own event string, e.g. `order.paid`. */
  rawEvent: string;
  kind: GatewayEventKind;
  providerEventId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  /** Decimal rupees. Convert at the provider boundary, never here. */
  amount?: number;
  now?: Date;
}

/**
 * Persist and claim.
 *
 * 🛑 **Throws** when the write fails for any reason other than "already
 * exists". The caller must answer **503** in that case — per the route's ack
 * contract, we hold no record, so the only honest response is "send it again".
 * Catching this and acking 200 loses the event, which is the failure this
 * module exists to prevent.
 */
export async function ingestGatewayEvent(
  input: IngestGatewayEventInput,
): Promise<GatewayEventClaimResult> {
  const bodySha256 = createHash("sha256").update(input.rawBody).digest("hex");
  const { payload, truncated } = redactGatewayPayload(input.body);

  const result = await gatewayEventsRepository().claim({
    gateway: input.gateway,
    rawEvent: input.rawEvent,
    kind: input.kind,
    bodySha256,
    ...(input.providerEventId ? { providerEventId: input.providerEventId } : {}),
    ...(input.gatewayOrderId ? { gatewayOrderId: input.gatewayOrderId } : {}),
    ...(input.gatewayPaymentId ? { gatewayPaymentId: input.gatewayPaymentId } : {}),
    ...(typeof input.amount === "number" ? { amount: input.amount } : {}),
    payload,
    ...(truncated ? { payloadTruncated: true } : {}),
    ...(input.now ? { now: input.now } : {}),
  });

  if (!result.claimed) {
    /*
     * A redelivery, or a second event carrying an identical body. Logged at
     * `info` because it is NORMAL traffic and not a fault — Razorpay's own
     * Resend button produces it, and so does any at-least-once delivery
     * schedule. The absence of a second row IS the feature working.
     */
    serverLogger.info("gatewayEvents: duplicate delivery — already have it", {
      id: result.id,
      rawEvent: input.rawEvent,
    });
  }

  return result;
}

/**
 * What to do about a delivery we have seen before.
 *
 * 🛑 THIS BRANCH EXISTS BECAUSE NAIVE DEDUPE WOULD HAVE BROKEN THE D4 FIX, and
 * the interaction is not obvious until you trace the two mechanisms together.
 *
 * Phase 0 made a transient placement failure answer **500**, specifically so
 * the gateway's own retry schedule becomes the safety net for a
 * captured-but-unplaced payment. Razorpay then redelivers **the same event
 * id**. So if "we already have a row for this id" meant "ack 200 and do
 * nothing", the retry we deliberately asked for would be swallowed by the
 * inbox — and a captured payment with no order would go back to being
 * unrecoverable. The inbox would have made things *worse* than no inbox.
 *
 * So a duplicate is resolved by reading its row — the one read the write-
 * amplification budget allows for this path — and the answer depends on where
 * that row got to:
 *
 * | existing row | action | why |
 * |---|---|---|
 * | `processed` / `ignored` / `conflict` | **ack** | done; nothing a retry can add |
 * | `failed` + `terminal: true` | **ack** | a retry cannot help; a human must look |
 * | `failed` without `terminal` | **redispatch** | transient — this IS the retry we asked for |
 * | `received`/`processing`, lease LIVE | **ack** | another worker has it; a 5xx would thundering-herd one order |
 * | `received`/`processing`, lease LAPSED | **redispatch** | the previous worker died mid-flight |
 * | row missing (raced its own deletion) | **redispatch** | treat as new rather than lose it |
 */
export type DuplicateAction = "ack" | "redispatch";

export interface DuplicateResolution {
  action: DuplicateAction;
  /** Attempts recorded so far — the caller renews the lease with this. */
  attempts: number;
  status?: GatewayEventStatus;
}

export async function resolveDuplicateDelivery(
  id: string,
  now: Date = new Date(),
): Promise<DuplicateResolution> {
  const existing = await gatewayEventsRepository().findById(id);

  if (!existing) {
    /*
     * The id exists (the create failed) but the row does not — a race with the
     * retention sweep, or a delete between the two calls. Fail toward DOING THE
     * WORK: re-dispatching an already-processed event is idempotent downstream
     * (the placement claim makes it a no-op), whereas acking an event we have
     * no record of is the loss this collection exists to prevent.
     */
    return { action: "redispatch", attempts: 1 };
  }

  if (
    existing.status === "processed" ||
    existing.status === "ignored" ||
    existing.status === "conflict"
  ) {
    return { action: "ack", attempts: existing.attempts, status: existing.status };
  }

  if (existing.status === "failed") {
    return {
      action: existing.terminal === true ? "ack" : "redispatch",
      attempts: existing.attempts,
      status: existing.status,
    };
  }

  // received | processing — decided by the lease, not by the status.
  const leaseLive = existing.leaseExpiresAt.getTime() > now.getTime();
  if (leaseLive) {
    return { action: "ack", attempts: existing.attempts, status: existing.status };
  }

  if (existing.attempts >= GATEWAY_EVENT_MAX_ATTEMPTS) {
    /*
     * Budget exhausted. Ack rather than loop forever — the row is `received`
     * with a lapsed lease and a maxed attempt count, which is exactly the shape
     * Phase 4's R1 sweep escalates into a case.
     */
    return { action: "ack", attempts: existing.attempts, status: existing.status };
  }

  /*
   * Taking over a dead worker's claim, so renew the lease HERE rather than
   * leaving it to the caller.
   *
   * 🛑 This is not a lock and does not pretend to be: `renewLease` is a plain
   * update, so two redeliveries arriving in the same instant can both read a
   * lapsed lease and both decide to dispatch. Narrowing that window is worth
   * one write; closing it would need a transaction, and a transaction here
   * would buy nothing — the thing that actually makes a double dispatch safe is
   * the placement claim in `verifyAndPlaceGatewayOrderAction`, which is
   * at-most-once on the gateway order id and turns the second attempt into a
   * no-op. Two guards for one hazard, and the downstream one is the real one.
   */
  try {
    await gatewayEventsRepository().renewLease(id, existing.attempts, now);
  } catch (err) {
    /*
     * Could not renew. Dispatch anyway: the alternative is dropping a retry we
     * explicitly asked the gateway for, and the row is already durable so the
     * sweep can still find it. The lease is an optimisation, not a correctness
     * boundary.
     */
    void normalizeError(err);
    serverLogger.warn("gatewayEvents: lease renewal failed — dispatching regardless", { id });
  }

  return { action: "redispatch", attempts: existing.attempts, status: existing.status };
}

export interface SettleGatewayEventInput {
  status: GatewayEventStatus;
  orderIds?: string[];
  lastError?: string;
  terminal?: boolean;
  now?: Date;
}

/**
 * Record the outcome. Never throws — by this point the event is durable and the
 * work is done, so a bookkeeping failure must not become a 5xx that makes the
 * gateway redeliver an event we processed successfully. The row is left
 * `received` with a lapsing lease, which the stuck-event sweep handles.
 */
export async function settleGatewayEvent(
  id: string,
  input: SettleGatewayEventInput,
): Promise<void> {
  try {
    await gatewayEventsRepository().settle(id, input);
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("gatewayEvents: settle failed — the stuck-event sweep will retry", {
      id,
      err,
    });
  }
}

/**
 * Translate a dispatch outcome into an inbox status.
 *
 * Kept here rather than inlined at the route so the mapping is stated once and
 * both halves of the ack contract — the HTTP status the gateway sees and the
 * row an operator reads — are derived from the same decision. Two hand-rolled
 * copies of this would be Root Cause #75's shape on the observability axis:
 * the row would say `processed` while the route answered 500.
 */
export function statusForDispatch(outcome: {
  handled: boolean;
  succeeded: boolean;
  retryable: boolean;
}): { status: GatewayEventStatus; terminal?: boolean } {
  if (!outcome.handled) return { status: "ignored" };
  if (outcome.succeeded) return { status: "processed" };
  return { status: "failed", terminal: !outcome.retryable };
}
