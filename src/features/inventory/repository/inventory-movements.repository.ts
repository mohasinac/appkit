/*
 * WHY: The ledger is the only thing that can answer "where did this go". That
 *      is worth nothing unless it is EVIDENCE, and evidence that can be
 *      edited is not evidence.
 * WHAT: Append, and read back by product, by box, or by shipment.
 *
 * ── 🛑 APPEND-ONLY, ENFORCED IN CODE AND NOT BY CONVENTION ────────────────
 *
 * `update` and `delete` are overridden to THROW. A comment saying "do not
 * edit these" is one forgetful caller away from being false, and the caller
 * would not find out — a Firestore update succeeds silently and the row that
 * used to prove where an item went now proves something else.
 *
 * `audit-inventory-ledger-append-only` blocks the other direction: a new
 * caller reaching past this repository to the raw collection.
 *
 * 🛑 Immutability is also why the denormalised `productTitle` / `*BoxCode` on
 * these rows are deliberately NEVER repaired. They are what things were
 * CALLED at the time, which is the correct thing for a historical record to
 * say — repairing them would rewrite history to match the present, and the
 * whole point of the row is that it does not.
 *
 * Holds no PII: `actorUid` is a uid, never a name.
 *
 * EXPORTS: InventoryMovementsRepository, inventoryMovementsRepository,
 *   InventoryMovementCreateInput
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag pattern:repository
 * @tag access:server
 * @tag sideEffects:firestore
 */

import {
  BaseRepository,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  INVENTORY_MOVEMENTS_COLLECTION,
  INVENTORY_MOVEMENT_FIELDS,
  MovementKindValues,
  type InventoryMovementDocument,
  type MovementKind,
} from "../schemas/firestore";

export interface InventoryMovementCreateInput {
  kind: MovementKind;
  productId: string;
  /** Always positive — direction is `from`/`to`, never the sign. */
  quantity: number;
  fromBoxId?: string;
  toBoxId?: string;
  occurredAt?: Date;
  actorUid: string;
  reason?: string;
  shipmentId?: string;
  productTitle?: string;
  fromBoxCode?: string;
  toBoxCode?: string;
}

/**
 * Which endpoints each kind requires.
 *
 * 🛑 A `Record<MovementKind, …>`, so a sixth kind is a COMPILE error rather
 * than a movement that validates against nothing. This is the shape Root
 * Cause #58/#61 are about: a `Set<string>` or an array keyed on a union
 * silently accepts a member nobody mapped.
 */
const ENDPOINTS: Record<MovementKind, { from: boolean; to: boolean }> = {
  // Stock arrives from outside the system, so there is no origin box.
  receive: { from: false, to: true },
  move: { from: true, to: true },
  // Stock leaves the system. No destination box.
  pick: { from: true, to: false },
  /*
   * An adjustment is a correction to ONE box's count — a found item or a
   * missing one — so it names the box it corrects and nothing else. Which
   * direction it went is carried by… nothing, deliberately: `reason` is
   * required on an adjust, and a human sentence is more use than a sign.
   */
  adjust: { from: false, to: true },
  // A count that agreed. Records that the box was verified, moves nothing.
  audit: { from: false, to: true },
};

export class InventoryMovementsRepository extends BaseRepository<InventoryMovementDocument> {
  constructor() {
    super(INVENTORY_MOVEMENTS_COLLECTION);
  }

  /**
   * Append one movement.
   *
   * Validates the shape before writing, because a ledger row that is
   * internally inconsistent cannot be fixed afterwards — `update` throws.
   */
  async append(
    input: InventoryMovementCreateInput,
  ): Promise<InventoryMovementDocument> {
    if (!MovementKindValues.includes(input.kind)) {
      throw new Error(`Unknown movement kind: ${input.kind}`);
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new Error(
        `Movement quantity must be a positive whole number, got ${input.quantity}. ` +
          `Direction is carried by fromBoxId/toBoxId, never by the sign.`,
      );
    }

    const shape = ENDPOINTS[input.kind];
    if (shape.from && !input.fromBoxId) {
      throw new Error(`A ${input.kind} movement needs a fromBoxId`);
    }
    if (!shape.from && input.fromBoxId) {
      throw new Error(`A ${input.kind} movement must not carry a fromBoxId`);
    }
    if (shape.to && !input.toBoxId) {
      throw new Error(`A ${input.kind} movement needs a toBoxId`);
    }
    if (!shape.to && input.toBoxId) {
      throw new Error(`A ${input.kind} movement must not carry a toBoxId`);
    }
    /*
     * 🛑 An `adjust` without a reason is a variance nobody explained, which
     * is indistinguishable from a typo three weeks later — and the row cannot
     * be amended to add one.
     */
    if (input.kind === "adjust" && !input.reason?.trim()) {
      throw new Error("An adjust movement needs a reason");
    }

    return this.create({
      ...input,
      occurredAt: input.occurredAt ?? new Date(),
    } as Omit<InventoryMovementDocument, "id" | "createdAt" | "updatedAt">);
  }

  /**
   * 🛑 THE LEDGER IS APPEND-ONLY. These two throw on purpose.
   *
   * Not `@deprecated`, not a comment — the method bodies refuse. A ledger
   * whose rows can be edited cannot be used as evidence, and the caller who
   * edited one would never find out: a Firestore update succeeds silently.
   */
  override async update(): Promise<never> {
    throw new Error(
      "inventoryMovements is append-only. Record a correcting `adjust` movement instead of editing history.",
    );
  }

  override async delete(): Promise<never> {
    throw new Error(
      "inventoryMovements is append-only. A movement that did not happen is corrected with an `adjust`, not removed.",
    );
  }

  /** This product's history, newest first. */
  async listByProduct(
    productId: string,
    limit = 50,
  ): Promise<InventoryMovementDocument[]> {
    const snap = await this.getCollection()
      .where(INVENTORY_MOVEMENT_FIELDS.PRODUCT_ID, "==", productId)
      .orderBy(INVENTORY_MOVEMENT_FIELDS.OCCURRED_AT, "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  /**
   * Everything that entered or left one box.
   *
   * 🛑 TWO QUERIES MERGED, not an `or`. A movement names a box in either
   * `fromBoxId` or `toBoxId`, and Firestore cannot `OR` across two fields
   * without a composite that still orders by one of them — so the honest
   * shape is two bounded reads merged and re-sorted in memory. Each is
   * `limit`-capped, so the worst case is `2 × limit` documents.
   */
  async listByBox(
    boxId: string,
    limit = 50,
  ): Promise<InventoryMovementDocument[]> {
    const [into, outOf] = await Promise.all([
      this.getCollection()
        .where(INVENTORY_MOVEMENT_FIELDS.TO_BOX_ID, "==", boxId)
        .orderBy(INVENTORY_MOVEMENT_FIELDS.OCCURRED_AT, "desc")
        .limit(limit)
        .get(),
      this.getCollection()
        .where(INVENTORY_MOVEMENT_FIELDS.FROM_BOX_ID, "==", boxId)
        .orderBy(INVENTORY_MOVEMENT_FIELDS.OCCURRED_AT, "desc")
        .limit(limit)
        .get(),
    ]);
    const rows = [...into.docs, ...outOf.docs].map((d) => this.mapDoc(d));
    rows.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return rows.slice(0, limit);
  }

  /** Everything received from one procurement shipment. */
  async listByShipment(
    shipmentId: string,
    limit = 200,
  ): Promise<InventoryMovementDocument[]> {
    const snap = await this.getCollection()
      .where(INVENTORY_MOVEMENT_FIELDS.SHIPMENT_ID, "==", shipmentId)
      .orderBy(INVENTORY_MOVEMENT_FIELDS.OCCURRED_AT, "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  async listForAdmin(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<InventoryMovementDocument>> {
    return this.sieveQuery<InventoryMovementDocument>(
      model,
      InventoryMovementsRepository.SIEVE_FIELDS,
      { defaultPageSize: 25, maxPageSize: 50 },
    );
  }

  /** Every Timestamp field carries `parseSieveDateValue` — Root Cause #47. */
  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.KIND]: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.PRODUCT_ID]: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.QUANTITY]: { canFilter: true, canSort: true },
    [INVENTORY_MOVEMENT_FIELDS.FROM_BOX_ID]: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.TO_BOX_ID]: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.ACTOR_UID]: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.SHIPMENT_ID]: { canFilter: true, canSort: false },
    [INVENTORY_MOVEMENT_FIELDS.OCCURRED_AT]: {
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
    },
    [INVENTORY_MOVEMENT_FIELDS.CREATED_AT]: {
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
    },
  };
}

export const inventoryMovementsRepository = new InventoryMovementsRepository();
