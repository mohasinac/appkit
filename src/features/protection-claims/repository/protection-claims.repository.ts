import { BaseRepository, prepareForFirestore } from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import { buildHistoryEntry } from "../../../_internal/shared/history/history";
import { ConflictError } from "../../../errors";
import {
  PROTECTION_CLAIMS_COLLECTION,
  PROTECTION_CLAIM_ACTIVE_STATUSES,
  PROTECTION_CLAIM_FIELDS,
  createProtectionClaimId,
  type ProtectionClaimDocument,
  type ProtectionClaimReason,
  type ProtectionClaimStatus,
} from "../schemas/firestore";
import { serverLogger } from "../../../monitoring";
import type {
  ClaimFinding,
  ClaimOutcome,
  ProtectionKind,
} from "../../../_internal/shared/features/shipping/protections";

const GRPC_ALREADY_EXISTS = 6;

function isAlreadyExists(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === GRPC_ALREADY_EXISTS) return true;
  if (code === "already-exists" || code === "ALREADY_EXISTS") return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && message.includes("ALREADY_EXISTS");
}

export interface FileClaimInput {
  kind: ProtectionKind;
  orderId: string;
  storeId: string;
  buyerId: string;
  reason: ProtectionClaimReason;
  detail: string;
  claimedAmount: number;
  itemIds?: string[];
  evidenceUrls?: string[];
  isTestData?: boolean;
  now?: Date;
}

export class ProtectionClaimsRepository extends BaseRepository<ProtectionClaimDocument> {
  constructor() {
    super(PROTECTION_CLAIMS_COLLECTION);
  }

  /**
   * File a claim. **Refuses a second claim on the same (order, kind).**
   *
   * 🛑 `.create()` with a deterministic id, and the refusal is a 409 rather
   * than a silent no-op — the buyer needs to know their existing claim is the
   * one being worked, not that their second attempt vanished.
   *
   * Why it matters more here than elsewhere: a protected sale claim is
   * refunded **unconditionally** (`adjudicateClaim` refunds on a
   * change-of-mind finding too, and only shifts who pays). So N claims on one
   * order would be N refunds against the same goods.
   */
  async file(input: FileClaimInput): Promise<ProtectionClaimDocument> {
    const now = input.now ?? new Date();
    const id = createProtectionClaimId(input.orderId, input.kind);

    const doc: ProtectionClaimDocument = {
      id,
      kind: input.kind,
      orderId: input.orderId,
      storeId: input.storeId,
      buyerId: input.buyerId,
      status: "open",
      reason: input.reason,
      detail: input.detail,
      claimedAmount: input.claimedAmount,
      ...(input.itemIds?.length ? { itemIds: input.itemIds } : {}),
      ...(input.evidenceUrls?.length ? { evidenceUrls: input.evidenceUrls } : {}),
      ...(input.isTestData ? { isTestData: true } : {}),
      statusHistory: [
        buildHistoryEntry({
          actor: { role: "buyer", uid: input.buyerId },
          trigger: `protectionClaim:file:${input.kind}`,
          changes: { status: { from: null, to: "open" } },
          reason: input.reason,
          now,
        }),
      ],
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.getCollection().doc(id).create(prepareForFirestore(doc));
      return doc;
    } catch (err) {
      if (isAlreadyExists(err)) {
        void normalizeError(err);
        throw new ConflictError(
          `A ${input.kind} protection claim is already open on this order. Add to that claim rather than filing a second one.`,
        );
      }
      void normalizeError(err);
      throw err;
    }
  }

  /**
   * Record the human finding and the outcome `adjudicateClaim` produced.
   *
   * 🛑 It does NOT move money. The refund is `processRefundAction`'s job, and
   * keeping them apart is what lets the refund carry its own idempotency key
   * — a claim that adjudicated and then failed to refund leaves a `upheld`
   * claim with no `refundId`, which is a findable state rather than a lost one.
   */
  async adjudicate(
    id: string,
    input: {
      finding: ClaimFinding;
      outcome: ClaimOutcome;
      adjudicatedBy: string;
      now?: Date;
    },
  ): Promise<void> {
    const now = input.now ?? new Date();
    const existing = await this.findById(id);
    const status: ProtectionClaimStatus = input.outcome.refundBuyer ? "upheld" : "rejected";

    await this.getCollection()
      .doc(id)
      .update({
        status,
        finding: input.finding,
        outcome: {
          refundBuyer: input.outcome.refundBuyer,
          costBorneBy: input.outcome.costBorneBy,
          raisesReport: input.outcome.raisesReport,
        },
        adjudicatedBy: input.adjudicatedBy,
        adjudicatedAt: now,
        updatedAt: now,
        statusHistory: [
          ...(existing?.statusHistory ?? []),
          buildHistoryEntry({
            actor: { role: "admin", uid: input.adjudicatedBy },
            trigger: "protectionClaim:adjudicate",
            changes: {
              status: { from: existing?.status ?? null, to: status },
              finding: { from: null, to: input.finding },
            },
            note: `cost borne by ${input.outcome.costBorneBy}`,
            now,
          }),
        ],
      });
  }

  /** Link the refund that settled this claim. */
  async attachRefund(id: string, refundId: string, now = new Date()): Promise<void> {
    try {
      await this.getCollection().doc(id).update({ refundId, updatedAt: now });
    } catch (err) {
      /*
       * Best effort, but RECORDED. `void normalizeError(err)` alone types the
       * error and reports it nowhere — as silent as `catch {}` while looking
       * handled, which is what audit-silent-degrade calls normalize theatre.
       * Swallowing is still correct here (the claim row is already durable; this is a best-effort annotation); losing the reason is not.
       */
      serverLogger.warn("protectionClaims.write failed", {
        error: normalizeError(err).message,
      });
    }
  }

  async setStatus(
    id: string,
    status: ProtectionClaimStatus,
    reason: string,
    now = new Date(),
  ): Promise<void> {
    try {
      const existing = await this.findById(id);
      await this.getCollection()
        .doc(id)
        .update({
          status,
          updatedAt: now,
          statusHistory: [
            ...(existing?.statusHistory ?? []),
            buildHistoryEntry({
              actor: { role: "system" },
              trigger: "protectionClaim:setStatus",
              changes: { status: { from: existing?.status ?? null, to: status } },
              reason,
              now,
            }),
          ],
        });
    } catch (err) {
      /*
       * Best effort, but RECORDED. `void normalizeError(err)` alone types the
       * error and reports it nowhere — as silent as `catch {}` while looking
       * handled, which is what audit-silent-degrade calls normalize theatre.
       * Swallowing is still correct here (the claim row is already durable; this is a best-effort annotation); losing the reason is not.
       */
      serverLogger.warn("protectionClaims.write failed", {
        error: normalizeError(err).message,
      });
    }
  }

  async findByOrderAndKind(
    orderId: string,
    kind: ProtectionKind,
  ): Promise<ProtectionClaimDocument | null> {
    return this.findById(createProtectionClaimId(orderId, kind));
  }

  /** The admin queue: claims still needing work, oldest first. */
  async listActive(limit = 100): Promise<ProtectionClaimDocument[]> {
    const snap = await this.getCollection()
      .where(PROTECTION_CLAIM_FIELDS.STATUS, "in", [...PROTECTION_CLAIM_ACTIVE_STATUSES])
      .orderBy(PROTECTION_CLAIM_FIELDS.CREATED_AT, "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<ProtectionClaimDocument>(d));
  }

  async listForBuyer(buyerId: string, limit = 50): Promise<ProtectionClaimDocument[]> {
    const snap = await this.getCollection()
      .where(PROTECTION_CLAIM_FIELDS.BUYER_ID, "==", buyerId)
      .orderBy(PROTECTION_CLAIM_FIELDS.CREATED_AT, "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<ProtectionClaimDocument>(d));
  }
}

let cached: ProtectionClaimsRepository | null = null;

export function protectionClaimsRepository(): ProtectionClaimsRepository {
  if (!cached) cached = new ProtectionClaimsRepository();
  return cached;
}
