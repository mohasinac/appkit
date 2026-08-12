/**
 * Shipment Items Repository — one doc per individually-tracked "main" item,
 * FK'd to a lot + shipment. Capped at MAX_ITEMS_PER_LOT (500) per lot —
 * exactly Firestore's native batched-write limit, so bulkCreate() writes an
 * entire import in a single WriteBatch with no chunking logic.
 */

import {
  BaseRepository,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  SHIPMENT_ITEM_COLLECTION,
  SHIPMENT_ITEM_FIELDS,
  MAX_ITEMS_PER_LOT,
  type ShipmentItem,
  type ShipmentItemCreateInput,
  type ShipmentItemUpdateInput,
} from "../schemas/firestore";
import { ValidationError } from "../../../errors";
import { sieveAnd, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";

export class ShipmentItemsRepository extends BaseRepository<ShipmentItem> {
  constructor() {
    super(SHIPMENT_ITEM_COLLECTION);
  }

  async listByLot(lotId: string, model?: SieveModel): Promise<FirebaseSieveResult<ShipmentItem>> {
    return this.sieveQuery<ShipmentItem>(
      { ...(model ?? {}), filters: sieveAnd(sieveFilter("lotId", SIEVE_OP.EQ, lotId), model?.filters) },
      ShipmentItemsRepository.SIEVE_FIELDS,
      { defaultPageSize: 50, maxPageSize: 100 },
    );
  }

  async countByLot(lotId: string): Promise<number> {
    const snap = await this.getCollection().where(SHIPMENT_ITEM_FIELDS.LOT_ID, "==", lotId).count().get();
    return snap.data().count;
  }

  /** Cheap bounded existence check — any item in this lot still linked to a product? */
  async hasLinkedItemsInLot(lotId: string): Promise<boolean> {
    const snap = await this.getCollection()
      .where(SHIPMENT_ITEM_FIELDS.LOT_ID, "==", lotId)
      .where(SHIPMENT_ITEM_FIELDS.LINKED_PRODUCT_ID, "!=", null)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async createItem(shipmentId: string, lotId: string, input: ShipmentItemCreateInput): Promise<ShipmentItem> {
    const existing = await this.countByLot(lotId);
    if (existing >= MAX_ITEMS_PER_LOT) {
      throw new ValidationError(`Lot already has the maximum of ${MAX_ITEMS_PER_LOT} tracked items`);
    }
    return this.create({ ...input, shipmentId, lotId });
  }

  /**
   * Writes an entire bulk-paste import in a single Firestore WriteBatch
   * (≤500 ops — Firestore's own batch cap, matching MAX_ITEMS_PER_LOT
   * exactly, so no chunking is ever needed).
   */
  async bulkCreate(
    shipmentId: string,
    lotId: string,
    rows: ShipmentItemCreateInput[],
  ): Promise<number> {
    const existing = await this.countByLot(lotId);
    if (existing + rows.length > MAX_ITEMS_PER_LOT) {
      throw new ValidationError(
        `This import would exceed the ${MAX_ITEMS_PER_LOT}-item cap for this lot (${existing} already tracked, ${rows.length} in this import)`,
      );
    }
    const batch = this.db.batch();
    rows.forEach((row) => {
      this.createInBatch(batch, { ...row, shipmentId, lotId });
    });
    await batch.commit();
    return rows.length;
  }

  async updateItem(itemId: string, input: ShipmentItemUpdateInput): Promise<ShipmentItem> {
    return this.update(itemId, input);
  }

  /** Clears a product link without touching the linked product itself. */
  async unlink(itemId: string): Promise<ShipmentItem> {
    return this.update(itemId, {
      linkedProductId: undefined,
      linkedProductSlug: undefined,
      linkedProductListingType: undefined,
    });
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    shipmentId: { canFilter: true, canSort: false },
    lotId: { canFilter: true, canSort: false },
    title: { canFilter: true, canSort: true },
    price: { canFilter: true, canSort: true },
    linkedProductId: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
  };
}

export const shipmentItemsRepository = new ShipmentItemsRepository();
