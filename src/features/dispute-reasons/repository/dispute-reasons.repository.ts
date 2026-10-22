import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import { BaseRepository } from "../../../providers/db-firebase";
import { slugify } from "../../../utils/string.formatter";
import type { DisputeKind } from "../../../_internal/shared/features/orders/dispute-reasons";
import {
  DISPUTE_REASON_COLLECTION,
  DISPUTE_REASON_FIELDS,
  DISPUTE_REASON_LABEL_MAX,
  type DisputeReasonDocument,
} from "../schemas/firestore";

export class DisputeReasonsRepository extends BaseRepository<DisputeReasonDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    /*
     * 🛑 `label` must be here because `PaginatedSelect` SEARCHES it. An
     * unallowlisted searched field does not raise — `sieve.ts` sets
     * `throwExceptions: false`, so `findField` returns undefined, the clause is
     * silently dropped, and the picker returns the WHOLE list while looking
     * exactly like it filtered (Root Cause #62).
     */
    label: { canFilter: true, canSort: true },
    kind: { canFilter: true, canSort: false },
    isActive: { canFilter: true, canSort: false },
    createdByUid: { canFilter: true, canSort: false },
  };

  constructor() {
    super(DISPUTE_REASON_COLLECTION);
  }

  /**
   * The picker's list, scoped to one kind.
   *
   * 🛑 Scoped by KIND, not merged. A buyer reporting a damaged item must not be
   * offered "it never arrived" — that reason belongs to the other gate, and
   * picking it would produce a dispute the gate then refuses, which reads to
   * the buyer as the form being broken rather than as the wrong choice.
   */
  async listActiveByKind(
    kind: DisputeKind,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<DisputeReasonDocument>> {
    const baseQuery = this.getCollection()
      .where(DISPUTE_REASON_FIELDS.IS_ACTIVE, "==", true)
      .where(DISPUTE_REASON_FIELDS.KIND, "==", kind);

    return this.sieveQuery<DisputeReasonDocument>(
      model,
      DisputeReasonsRepository.SIEVE_FIELDS,
      { baseQuery, defaultPageSize: 20, maxPageSize: 50 },
    );
  }

  /**
   * Add a reason. Staff only — enforced at the route, not here.
   *
   * 🛑 Keyed `dreason-<slug>`, so two agents cannot add the same wording twice.
   * A colliding create returns the EXISTING row rather than overwriting it:
   * that row has an author and may already be named on live disputes, and the
   * second agent's intent ("there should be a reason for this") is satisfied by
   * what exists. Same rule as the shipping-box presets.
   */
  async createReason(input: {
    label: string;
    kind: DisputeKind;
    createdByUid: string;
    createdByName: string;
  }): Promise<{ reason: DisputeReasonDocument; created: boolean }> {
    const label = input.label.trim().slice(0, DISPUTE_REASON_LABEL_MAX);
    const id = `dreason-${slugify(label)}`;

    const existing = await this.findById(id);
    /*
     * A retired row that someone re-adds is REACTIVATED rather than duplicated
     * — otherwise the slug collides forever and the agent can never get their
     * reason back. Reactivating keeps the original author, which is correct:
     * they wrote the wording.
     */
    if (existing) {
      if (!existing.isActive) {
        await this.update(id, { isActive: true, updatedAt: new Date() });
        return { reason: { ...existing, isActive: true }, created: false };
      }
      return { reason: existing, created: false };
    }

    const now = new Date();
    const reason: DisputeReasonDocument = {
      id,
      label,
      kind: input.kind,
      isActive: true,
      createdByUid: input.createdByUid,
      createdByName: input.createdByName,
      createdAt: now,
      updatedAt: now,
    };

    await this.createWithId(id, reason);
    return { reason, created: true };
  }

  /** Soft-retire. See the schema for why this is never a delete. */
  async retire(id: string): Promise<void> {
    await this.update(id, { isActive: false, updatedAt: new Date() });
  }
}

export const disputeReasonsRepository = new DisputeReasonsRepository();
