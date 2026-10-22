// One shared predicate — this file had its own copy; see firestore-codes.ts.
import { isAlreadyExistsError } from "../../../errors/firestore-codes";
import type { DocumentReference } from "firebase-admin/firestore";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import {
  BaseRepository,
  applySieveToFirestore,
  parseSieveDateValue,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import {
  GATEWAY_EVENTS_COLLECTION,
  GATEWAY_EVENT_ERROR_MAX_BYTES,
  GATEWAY_EVENT_FIELDS,
  GATEWAY_EVENT_LEASE_SECONDS,
  GATEWAY_EVENT_RETENTION_DAYS,
  createGatewayEventId,
  type GatewayEventDocument,
  type GatewayEventKind,
  type GatewayEventStatus,
} from "../schemas/firestore";

/** gRPC `ALREADY_EXISTS`. The one failure of `.create()` that means "duplicate". */
function truncate(value: string | undefined, maxBytes: number): string | undefined {
  if (!value) return undefined;
  return value.length <= maxBytes ? value : value.slice(0, maxBytes);
}

export interface GatewayEventClaimInput {
  gateway: string;
  rawEvent: string;
  kind: GatewayEventKind;
  bodySha256: string;
  providerEventId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  amount?: number;
  payload?: GatewayEventDocument["payload"];
  payloadTruncated?: boolean;
  /** Injectable so a job's `ctx.now` drives the lease rather than wall clock. */
  now?: Date;
}

export type GatewayEventClaimResult =
  | { claimed: true; id: string; doc: GatewayEventDocument }
  | { claimed: false; id: string };

export interface GatewayEventSettleInput {
  status: GatewayEventStatus;
  orderIds?: string[];
  lastError?: string;
  terminal?: boolean;
  now?: Date;
}

export class GatewayEventsRepository extends BaseRepository<GatewayEventDocument> {
  /**
   * 🛑 Every date field carries `parseValue: parseSieveDateValue`, and it is not
   * optional: these are stored Firestore Timestamps, and sievejs' default
   * `convertValue()` only coerces `"true"`/`"false"`/numeric strings. An ISO
   * string therefore reaches the adapter unchanged and becomes
   * `.where("receivedAt", ">=", "<iso-string>")` — a type mismatch against a
   * Timestamp, which matches **zero documents with no error at all**
   * (Root Cause #47). `audit-sieve-date-fields` blocks the omission.
   */
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    gateway: { canFilter: true, canSort: false },
    rawEvent: { canFilter: true, canSort: false },
    kind: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    terminal: { canFilter: true, canSort: false },
    providerEventId: { canFilter: true, canSort: false },
    gatewayOrderId: { canFilter: true, canSort: false },
    gatewayPaymentId: { canFilter: true, canSort: false },
    attempts: { canFilter: true, canSort: true },
    receivedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    claimedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    leaseExpiresAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    processedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    expiresAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(GATEWAY_EVENTS_COLLECTION);
  }

  /**
   * Persist-and-claim in one write. Returns `claimed: false` for a duplicate.
   *
   * 🛑 THROWS on any write failure that is not a duplicate — see
   * `isAlreadyExists`. The caller must translate that into a 503 so the gateway
   * redelivers; swallowing it is how an event is lost.
   */
  async claim(input: GatewayEventClaimInput): Promise<GatewayEventClaimResult> {
    const now = input.now ?? new Date();
    const id = createGatewayEventId(input.gateway, input.providerEventId, input.bodySha256);

    const doc: GatewayEventDocument = {
      id,
      gateway: input.gateway,
      rawEvent: input.rawEvent,
      kind: input.kind,
      status: "received",
      bodySha256: input.bodySha256,
      ...(input.providerEventId ? { providerEventId: input.providerEventId } : {}),
      ...(input.gatewayOrderId ? { gatewayOrderId: input.gatewayOrderId } : {}),
      ...(input.gatewayPaymentId ? { gatewayPaymentId: input.gatewayPaymentId } : {}),
      ...(typeof input.amount === "number" ? { amount: input.amount } : {}),
      ...(input.payload ? { payload: input.payload } : {}),
      ...(input.payloadTruncated ? { payloadTruncated: true } : {}),
      receivedAt: now,
      claimedAt: now,
      leaseExpiresAt: new Date(now.getTime() + GATEWAY_EVENT_LEASE_SECONDS * 1000),
      attempts: 1,
      expiresAt: new Date(now.getTime() + GATEWAY_EVENT_RETENTION_DAYS * 86_400_000),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.getCollection().doc(id).create(prepareForFirestore(doc));
      return { claimed: true, id, doc };
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        void normalizeError(err);
        return { claimed: false, id };
      }
      /*
       * Not a duplicate — a real write failure. Normalised for the log trail
       * and then RETHROWN, deliberately: the inbox holds no record, so the only
       * honest answer to the gateway is "send it again".
       */
      void normalizeError(err);
      throw err;
    }
  }

  /** Flip a claimed row to its outcome. Never throws — see the docstring. */
  async settle(id: string, input: GatewayEventSettleInput): Promise<void> {
    const now = input.now ?? new Date();
    try {
      await this.getCollection()
        .doc(id)
        .update({
          status: input.status,
          processedAt: now,
          updatedAt: now,
          ...(input.orderIds?.length ? { orderIds: input.orderIds } : {}),
          ...(input.lastError
            ? { lastError: truncate(input.lastError, GATEWAY_EVENT_ERROR_MAX_BYTES) }
            : {}),
          ...(typeof input.terminal === "boolean" ? { terminal: input.terminal } : {}),
        });
    } catch (err) {
      /*
       * Swallowed on purpose, and the asymmetry with `claim` is the reason: by
       * the time we settle, the EVENT IS ALREADY DURABLE and the work is
       * already done. Rethrowing would turn a bookkeeping failure into a 5xx
       * and have the gateway redeliver an event we successfully processed. The
       * row is left `received` with a lease that expires, which the stuck-event
       * sweep then picks up — the right failure mode.
       */
      void normalizeError(err);
      console.error("[gatewayEvents.settle] failed to persist outcome", { id, err });
    }
  }

  /**
   * R1's query: rows claimed but never settled, whose lease has lapsed.
   *
   * 🛑 `status` is an `in` equality and `leaseExpiresAt` the single inequality,
   * which is the only shape Firestore will serve without demanding the
   * inequality field lead the `orderBy` (Root Cause #59). Ordered by
   * `leaseExpiresAt` for exactly that reason — not by `receivedAt`, which would
   * need an index in an order nobody declares.
   */
  async listStuck(now: Date, limit = 20): Promise<GatewayEventDocument[]> {
    const snap = await this.getCollection()
      .where(GATEWAY_EVENT_FIELDS.STATUS, "in", ["received", "processing"])
      .where(GATEWAY_EVENT_FIELDS.LEASE_EXPIRES_AT, "<", now)
      .orderBy(GATEWAY_EVENT_FIELDS.LEASE_EXPIRES_AT, "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<GatewayEventDocument>(d));
  }

  /**
   * Make the NEXT delivery of this event be accepted instead of acked.
   *
   * ## 🛑 IT DOES NOT REPROCESS ANYTHING, AND THE NAME SAYS SO
   *
   * There is no way to replay a gateway event from here, deliberately. R1's own
   * header gives the reason: re-dispatching from a job or an admin button would
   * mean duplicating the webhook route's entire switch — and its RTDB
   * signalling — in a second place, which is Root Cause #75 on the dispatch
   * axis. The webhook route is the only thing that knows how to handle an event.
   *
   * So this reopens the DOOR and nothing more. The operator still has to press
   * Resend in the gateway dashboard (or wait for the gateway's own retry); this
   * is what stops the inbox from refusing that redelivery as a duplicate.
   *
   * Anything calling this must tell the operator that second step is theirs. A
   * button labelled "Reprocess" that only did this would be the worst kind of
   * half-truth — it would look like the work had been done.
   *
   * ## Why these four fields, read off `resolveDuplicateDelivery`'s table
   *
   * That function decides ack-vs-redispatch, and three of its branches would
   * otherwise swallow the redelivery:
   *
   *   · `processed` / `ignored` / `conflict` → always ack. Hence `status` is
   *     reset to `failed`, the one non-terminal state that redispatches.
   *   · `failed` + `terminal: true` → ack. Hence `terminal: false`.
   *   · lapsed lease but `attempts >= GATEWAY_EVENT_MAX_ATTEMPTS` → ack. Hence
   *     `attempts: 0`.
   *
   * And the lease is set to `now`, i.e. already expired, because the
   * received/processing branch is decided by the LEASE rather than the status —
   * a live lease means "another worker has this" and must keep acking.
   *
   * `lastError` records that a human did this, so the row does not read as a
   * fresh transient failure to whoever looks next.
   */
  async reopenForRedelivery(id: string, actorUid: string, now: Date = new Date()): Promise<void> {
    await this.getCollection()
      .doc(id)
      .update({
        status: "failed",
        terminal: false,
        attempts: 0,
        claimedAt: now,
        // Already lapsed — see the docstring: the lease, not the status, is what
        // decides the received/processing branch.
        leaseExpiresAt: now,
        lastError: `Reopened for redelivery by ${actorUid}`,
        updatedAt: now,
      });
  }

  /** Take over a lapsed lease and count the attempt. */
  async renewLease(id: string, attempts: number, now: Date): Promise<void> {
    await this.getCollection()
      .doc(id)
      .update({
        status: "processing",
        attempts: attempts + 1,
        claimedAt: now,
        leaseExpiresAt: new Date(now.getTime() + GATEWAY_EVENT_LEASE_SECONDS * 1000),
        updatedAt: now,
      });
  }

  /** Every event for one gateway order — the reconciliation join. */
  async findByGatewayOrderId(gatewayOrderId: string): Promise<GatewayEventDocument[]> {
    const snap = await this.getCollection()
      .where(GATEWAY_EVENT_FIELDS.GATEWAY_ORDER_ID, "==", gatewayOrderId)
      .orderBy(GATEWAY_EVENT_FIELDS.RECEIVED_AT, "desc")
      .limit(50)
      .get();
    return snap.docs.map((d) => this.mapDoc<GatewayEventDocument>(d));
  }

  /**
   * Retention: refs for rows past `expiresAt`, for the caller's batch delete.
   * Mirrors `sessionRepository.getExpiredRefs` so `dailyDataCleanup` composes
   * it the same way it composes sessions and tokens.
   */
  async getExpiredRefs(now: Date, limit = 500): Promise<DocumentReference[]> {
    const snap = await this.getCollection()
      .where(GATEWAY_EVENT_FIELDS.EXPIRES_AT, "<", now)
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<GatewayEventDocument>> {
    return applySieveToFirestore<GatewayEventDocument>({
      baseQuery: this.getCollection(),
      model,
      fields: GatewayEventsRepository.SIEVE_FIELDS,
    });
  }
}

let cached: GatewayEventsRepository | null = null;

/** Lazy singleton — avoids cold-start admin SDK init when nothing is ingesting. */
export function gatewayEventsRepository(): GatewayEventsRepository {
  if (!cached) cached = new GatewayEventsRepository();
  return cached;
}
