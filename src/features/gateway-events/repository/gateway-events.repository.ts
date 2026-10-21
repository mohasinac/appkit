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
const GRPC_ALREADY_EXISTS = 6;

/**
 * Is this the specific "a document with that id already exists" failure, as
 * opposed to any other write failure?
 *
 * 🛑 THIS DISTINCTION IS THE WHOLE POINT, and it is where the inbox differs
 * from every other `.create()` claim in the codebase.
 *
 * `refunds/actions.ts` catches *every* error from its claim and treats it as a
 * duplicate — and that is correct THERE, because the cost of being wrong is
 * issuing a second real refund, so it must fail CLOSED.
 *
 * Here the cost of being wrong is inverted: treating a permissions error or a
 * Firestore outage as "already have it" would make the route ack 200 and the
 * event would be **silently lost** — which is the exact failure this collection
 * exists to prevent. So the inbox fails OPEN: anything that is not
 * ALREADY_EXISTS propagates, the route answers 503, and the gateway sends it
 * again.
 *
 * Same primitive, opposite failure direction, because the asymmetry of harm is
 * opposite. Do not "unify" these two call sites.
 */
function isAlreadyExists(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === GRPC_ALREADY_EXISTS) return true;
  /*
   * The Admin SDK has also surfaced this as a string code and as a plain
   * message depending on version and transport. Checked in addition to, never
   * instead of, the numeric code — a message test alone is the kind of
   * stringly-typed guard that breaks silently on an SDK bump.
   */
  if (code === "already-exists" || code === "ALREADY_EXISTS") return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && message.includes("ALREADY_EXISTS");
}

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
      if (isAlreadyExists(err)) {
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
