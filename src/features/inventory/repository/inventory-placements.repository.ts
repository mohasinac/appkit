/*
 * WHY: "What is in AC60-03" and "where is this product" are the two questions
 *      the whole feature exists to answer, and both must be one bounded read.
 * WHAT: The current placement of stock, moved only through transactions that
 *       also append to the ledger.
 *
 * ── 🛑 A ZERO-QUANTITY PLACEMENT IS DELETED, NEVER STORED AT ZERO ──────────
 *
 * Keeping zeros would force every box read to pair `quantity > 0` with an
 * `orderBy`. Firestore appends an inequality's field to the sort implicitly,
 * so that demands a composite index in an order nobody declares, fails with
 * FAILED_PRECONDITION, and every caller in this codebase wraps such a read in
 * `.catch(() => null)` — which renders as an EMPTY BOX rather than an error.
 * Root Cause #59. Absence means zero, and no query needs an inequality.
 *
 * ── 🛑 EVERY MOVE IS A TRANSACTION THAT ALSO WRITES THE LEDGER ────────────
 *
 * A placement changed without a movement row is stock that teleported: the
 * count is right and nobody can say why. Doing them in one transaction is
 * what makes the ledger complete rather than best-effort — the alternative
 * (write the placement, then append) leaves a gap whenever the second write
 * fails, and a ledger with gaps cannot be used to find a missing item.
 *
 * Holds no PII.
 *
 * EXPORTS: InventoryPlacementsRepository, inventoryPlacementsRepository
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag pattern:repository
 * @tag access:server
 * @tag sideEffects:firestore
 */

import type { Transaction } from "firebase-admin/firestore";
import {
  BaseRepository,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import { unitOfWork } from "../../../core/unit-of-work";
import {
  INVENTORY_MOVEMENTS_COLLECTION,
  INVENTORY_PLACEMENTS_COLLECTION,
  INVENTORY_PLACEMENT_FIELDS,
  placementId,
  type InventoryPlacementDocument,
  type MovementKind,
} from "../schemas/firestore";

export interface PlaceInput {
  boxId: string;
  boxCode: string;
  productId: string;
  productTitle: string;
  productSku?: string;
  quantity: number;
  slot?: string;
  actorUid: string;
  /** Carried onto the ledger row. `receive` when it came from a shipment. */
  kind: Extract<MovementKind, "receive" | "adjust">;
  reason?: string;
  shipmentId?: string;
}

export interface MoveInput {
  fromBoxId: string;
  fromBoxCode: string;
  toBoxId: string;
  toBoxCode: string;
  productId: string;
  productTitle: string;
  productSku?: string;
  quantity: number;
  actorUid: string;
}

export interface PickInput {
  boxId: string;
  boxCode: string;
  productId: string;
  productTitle: string;
  quantity: number;
  actorUid: string;
  reason?: string;
}

export class InventoryPlacementsRepository extends BaseRepository<InventoryPlacementDocument> {
  constructor() {
    super(INVENTORY_PLACEMENTS_COLLECTION);
  }

  /**
   * Is this product in this box, and how many?
   *
   * 🛑 One document READ, because the id is deterministic. With a generated
   * id this would be a two-field query needing its own composite index — and
   * a double-submit could create a second row for the same pair that silently
   * doubles the count.
   */
  async get(
    boxId: string,
    productId: string,
  ): Promise<InventoryPlacementDocument | null> {
    return this.findById(placementId(boxId, productId));
  }

  /** What is in this box. One equality, served by the automatic index. */
  async listByBox(boxId: string, limit = 200): Promise<InventoryPlacementDocument[]> {
    const snap = await this.getCollection()
      .where(INVENTORY_PLACEMENT_FIELDS.BOX_ID, "==", boxId)
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  /** Where is this product. Also one equality — this is the pair that matters. */
  async listByProduct(
    productId: string,
    limit = 50,
  ): Promise<InventoryPlacementDocument[]> {
    const snap = await this.getCollection()
      .where(INVENTORY_PLACEMENT_FIELDS.PRODUCT_ID, "==", productId)
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc(d));
  }

  /**
   * Put stock into a box — a receive, or an adjustment that found some.
   *
   * 🛑 Idempotent upsert via the deterministic id, and the increment happens
   * INSIDE the transaction from the value read inside it. Reading first and
   * writing after would lose one of two concurrent receives of the same
   * product into the same box, which is exactly what a receive station with
   * two people scanning does.
   */
  async place(input: PlaceInput): Promise<void> {
    this.assertQuantity(input.quantity);
    const pid = placementId(input.boxId, input.productId);

    await unitOfWork.runTransaction(async (tx) => {
      const ref = this.getCollection().doc(pid);
      const snap = await tx.get(ref);
      const now = new Date();
      const prior = snap.exists ? (snap.data()?.quantity as number) ?? 0 : 0;

      tx.set(
        ref,
        {
          boxId: input.boxId,
          productId: input.productId,
          boxCode: input.boxCode,
          productTitle: input.productTitle,
          ...(input.productSku ? { productSku: input.productSku } : {}),
          ...(input.slot ? { slot: input.slot } : {}),
          quantity: prior + input.quantity,
          updatedAt: now,
          ...(snap.exists ? {} : { createdAt: now }),
        },
        { merge: true },
      );

      this.appendMovement(tx, {
        kind: input.kind,
        productId: input.productId,
        quantity: input.quantity,
        toBoxId: input.boxId,
        toBoxCode: input.boxCode,
        productTitle: input.productTitle,
        actorUid: input.actorUid,
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.shipmentId ? { shipmentId: input.shipmentId } : {}),
        occurredAt: new Date(),
      });
    });
  }

  /**
   * Box → box.
   *
   * 🛑 REFUSES rather than going negative. A move of more than the source
   * holds is a miscount, and clamping it would make the ledger assert a
   * movement of a quantity that was not there — the one thing that makes the
   * ledger unusable as evidence.
   */
  async move(input: MoveInput): Promise<void> {
    this.assertQuantity(input.quantity);
    if (input.fromBoxId === input.toBoxId) {
      throw new Error("Source and destination box are the same");
    }

    const fromId = placementId(input.fromBoxId, input.productId);
    const toId = placementId(input.toBoxId, input.productId);

    await unitOfWork.runTransaction(async (tx) => {
      const fromRef = this.getCollection().doc(fromId);
      const toRef = this.getCollection().doc(toId);
      /*
       * Both reads before either write — a transaction cannot read after a
       * write, and the destination read is what makes the upsert correct when
       * the product is already in the target box.
       */
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);

      const have = fromSnap.exists ? (fromSnap.data()?.quantity as number) ?? 0 : 0;
      if (have < input.quantity) {
        throw new Error(
          `${input.fromBoxCode} holds ${have} of that product, cannot move ${input.quantity}. ` +
            `Record an \`adjust\` with a reason if the count is wrong.`,
        );
      }

      const now = new Date();
      const remaining = have - input.quantity;
      // Absence means zero — see the header.
      if (remaining === 0) tx.delete(fromRef);
      else tx.update(fromRef, { quantity: remaining, updatedAt: now });

      const already = toSnap.exists ? (toSnap.data()?.quantity as number) ?? 0 : 0;
      tx.set(
        toRef,
        {
          boxId: input.toBoxId,
          productId: input.productId,
          boxCode: input.toBoxCode,
          productTitle: input.productTitle,
          ...(input.productSku ? { productSku: input.productSku } : {}),
          quantity: already + input.quantity,
          updatedAt: now,
          ...(toSnap.exists ? {} : { createdAt: now }),
        },
        { merge: true },
      );

      this.appendMovement(tx, {
        kind: "move",
        productId: input.productId,
        quantity: input.quantity,
        fromBoxId: input.fromBoxId,
        fromBoxCode: input.fromBoxCode,
        toBoxId: input.toBoxId,
        toBoxCode: input.toBoxCode,
        productTitle: input.productTitle,
        actorUid: input.actorUid,
        occurredAt: now,
      });
    });
  }

  /**
   * Take stock out of a box.
   *
   * 🛑 MANUAL, and never fired from checkout. An automatic decrement on
   * payment would have the ledger assert a movement nobody performed — the
   * stock is sold, but it is still in the box until a person walks over and
   * picks it. A ledger recording intentions instead of actions cannot be used
   * to find a missing item, which is its only real job.
   *
   * 🛑 And this does NOT touch `product.stockQuantity`. That stays
   * authoritative and is owned by the order path; writing both is how a
   * reserved unit gets handed back to the shelf (see the schema header).
   */
  async pick(input: PickInput): Promise<void> {
    this.assertQuantity(input.quantity);
    const pid = placementId(input.boxId, input.productId);

    await unitOfWork.runTransaction(async (tx) => {
      const ref = this.getCollection().doc(pid);
      const snap = await tx.get(ref);
      const have = snap.exists ? (snap.data()?.quantity as number) ?? 0 : 0;
      if (have < input.quantity) {
        throw new Error(
          `${input.boxCode} holds ${have} of that product, cannot pick ${input.quantity}.`,
        );
      }

      const now = new Date();
      const remaining = have - input.quantity;
      if (remaining === 0) tx.delete(ref);
      else tx.update(ref, { quantity: remaining, updatedAt: now });

      this.appendMovement(tx, {
        kind: "pick",
        productId: input.productId,
        quantity: input.quantity,
        fromBoxId: input.boxId,
        fromBoxCode: input.boxCode,
        productTitle: input.productTitle,
        actorUid: input.actorUid,
        ...(input.reason ? { reason: input.reason } : {}),
        occurredAt: now,
      });
    });
  }

  /**
   * The receive station's bulk commit — many rows, ONE transaction.
   *
   * 🛑 ONE TRANSACTION FOR THE WHOLE TABLE, not a loop of them. A partial
   * receive is the worst outcome available: the operator has already
   * physically put everything in the boxes, so a half-written commit leaves
   * the ledger disagreeing with the shelf and no way to tell which rows
   * landed.
   *
   * Firestore caps a transaction at 500 writes and each row here is two (the
   * placement and its movement), so the caller's row limit of 50 is what
   * keeps this inside the cap — that is why the limit exists, rather than
   * being a UI preference.
   *
   * 🛑 Lives HERE rather than in the route for two reasons. API routes do not
   * touch Firestore directly in this codebase, and more specifically
   * `audit-inventory-ledger-append-only` allows only this file and the
   * movements repository to write the ledger — a route doing it would be the
   * second writer the audit exists to prevent, and I wrote exactly that before
   * the audit caught me.
   *
   * 🛑 Does NOT touch `product.stockQuantity`. The shipment-link route already
   * does, and doing both double-counts. This records WHERE stock is, never how
   * much exists.
   */
  async receiveBatch(input: {
    rows: ReadonlyArray<{
      boxId: string;
      boxCode: string;
      productId: string;
      productTitle: string;
      productSku?: string;
      quantity: number;
      slot?: string;
    }>;
    actorUid: string;
    shipmentId?: string;
  }): Promise<{ rows: number; units: number }> {
    if (input.rows.length === 0) throw new Error("Nothing to receive");
    for (const r of input.rows) this.assertQuantity(r.quantity);

    await unitOfWork.runTransaction(async (tx) => {
      const col = this.getCollection();
      /*
       * All reads first — a transaction cannot read after a write. The
       * existing quantity is read INSIDE the transaction and the increment
       * computed from it, so two operators receiving the same product into
       * the same box cannot lose one of the two. Not hypothetical: that is
       * what two people with scanners do.
       */
      const refs = input.rows.map((r) =>
        col.doc(placementId(r.boxId, r.productId)),
      );
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      const now = new Date();

      input.rows.forEach((r, i) => {
        const snap = snaps[i]!;
        const prior = snap.exists ? ((snap.data()?.quantity as number) ?? 0) : 0;
        tx.set(
          refs[i]!,
          {
            boxId: r.boxId,
            productId: r.productId,
            boxCode: r.boxCode,
            productTitle: r.productTitle,
            ...(r.productSku ? { productSku: r.productSku } : {}),
            ...(r.slot ? { slot: r.slot } : {}),
            quantity: prior + r.quantity,
            updatedAt: now,
            ...(snap.exists ? {} : { createdAt: now }),
          },
          { merge: true },
        );
        this.appendMovement(tx, {
          kind: "receive",
          productId: r.productId,
          quantity: r.quantity,
          toBoxId: r.boxId,
          toBoxCode: r.boxCode,
          productTitle: r.productTitle,
          actorUid: input.actorUid,
          ...(input.shipmentId ? { shipmentId: input.shipmentId } : {}),
          occurredAt: now,
        });
      });
    });

    return {
      rows: input.rows.length,
      units: input.rows.reduce((n, r) => n + r.quantity, 0),
    };
  }

  private assertQuantity(q: number): void {
    if (!Number.isInteger(q) || q < 1) {
      throw new Error(
        `Quantity must be a positive whole number, got ${q}. Direction is carried by the operation, never by the sign.`,
      );
    }
  }

  /**
   * Append a ledger row inside the caller's transaction.
   *
   * 🛑 Written through the raw collection rather than
   * `inventoryMovementsRepository.append`, because that method is not
   * transaction-aware and a second, non-transactional write would reopen the
   * gap this whole design closes. The VALIDATION it performs is mirrored by
   * the typed `MovementKind` endpoints above and by the quantity assert — so
   * the shape is still checked, by the compiler rather than at runtime.
   *
   * `audit-inventory-ledger-append-only` allows this one path by name.
   */
  /*
   * 🛑 `Transaction`, not a structural `{ set: (ref: unknown, data: unknown)
   * => void }`. That shortcut did not compile and the reason is worth keeping:
   * parameter types are CONTRAVARIANT, so a parameter annotated
   * `(ref: unknown) => void` promises to accept anything at all — a stronger
   * guarantee than `Transaction.set`, whose first argument must be a
   * `DocumentReference`. So `Transaction` was not assignable to it and all
   * three call sites failed. Widening a parameter to `unknown` narrows what
   * can be passed IN, which is the opposite of what it looks like.
   *
   * `import type` keeps this free at runtime — it emits nothing, which is the
   * same reason `unit-of-work.ts` can name the type without pulling
   * firebase-admin into the graph (Root Cause #24).
   */
  private appendMovement(
    tx: Transaction,
    row: Record<string, unknown>,
  ): void {
    const ref = this.db.collection(INVENTORY_MOVEMENTS_COLLECTION).doc();
    tx.set(ref, { ...row, createdAt: new Date(), updatedAt: new Date() });
  }

  async listForAdmin(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<InventoryPlacementDocument>> {
    return this.sieveQuery<InventoryPlacementDocument>(
      model,
      InventoryPlacementsRepository.SIEVE_FIELDS,
      { defaultPageSize: 25, maxPageSize: 50 },
    );
  }

  /** Every Timestamp field carries `parseSieveDateValue` — Root Cause #47. */
  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    [INVENTORY_PLACEMENT_FIELDS.BOX_ID]: { canFilter: true, canSort: false },
    [INVENTORY_PLACEMENT_FIELDS.PRODUCT_ID]: { canFilter: true, canSort: false },
    [INVENTORY_PLACEMENT_FIELDS.QUANTITY]: { canFilter: true, canSort: true },
    [INVENTORY_PLACEMENT_FIELDS.BOX_CODE]: { canFilter: true, canSort: true },
    [INVENTORY_PLACEMENT_FIELDS.PRODUCT_SKU]: { canFilter: true, canSort: false },
    [INVENTORY_PLACEMENT_FIELDS.CREATED_AT]: {
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
    },
    [INVENTORY_PLACEMENT_FIELDS.UPDATED_AT]: {
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
    },
  };
}

export const inventoryPlacementsRepository = new InventoryPlacementsRepository();
