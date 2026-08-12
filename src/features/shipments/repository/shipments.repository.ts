/**
 * Procurement Shipments Repository — header document only.
 * Lots/items live in ShipmentLotsRepository / ShipmentItemsRepository.
 */

import {
  BaseRepository,
  prepareForFirestore,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import { ConflictError } from "../../../errors";
import {
  SHIPMENT_COLLECTION,
  SHIPMENT_FIELDS,
  SHIPMENT_ITEM_COLLECTION,
  DEFAULT_SHIPMENT_TOTALS,
  createShipmentId,
  type ShipmentDocument,
  type ShipmentCreateInput,
  type ShipmentUpdateInput,
} from "../schemas/firestore";

export class ShipmentsRepository extends BaseRepository<ShipmentDocument> {
  constructor() {
    super(SHIPMENT_COLLECTION);
  }

  async findByShipmentNumber(shipmentNumber: string): Promise<ShipmentDocument | null> {
    return this.findOneBy(SHIPMENT_FIELDS.SHIPMENT_NUMBER, shipmentNumber);
  }

  private async assertShipmentNumberAvailable(shipmentNumber: string, excludeId?: string): Promise<void> {
    const existing = await this.findByShipmentNumber(shipmentNumber);
    if (existing && existing.id !== excludeId) {
      throw new ConflictError(
        `Shipment number "${shipmentNumber}" is already in use`,
        "SHIPMENT_NUMBER_TAKEN",
      );
    }
  }

  async create(input: ShipmentCreateInput): Promise<ShipmentDocument> {
    await this.assertShipmentNumberAvailable(input.shipmentNumber);
    const id = createShipmentId({ supplierName: input.supplierName });
    const data: Omit<ShipmentDocument, "id"> = {
      ...input,
      totals: DEFAULT_SHIPMENT_TOTALS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.getCollection().doc(id).set(prepareForFirestore(data));
    return { id, ...data };
  }

  override async update(shipmentId: string, input: ShipmentUpdateInput): Promise<ShipmentDocument> {
    if (input.shipmentNumber) {
      await this.assertShipmentNumberAvailable(input.shipmentNumber, shipmentId);
    }
    return super.update(shipmentId, input as Partial<ShipmentDocument>);
  }

  /** Cheap bounded existence check — any item under this shipment still linked to a product? */
  private async hasLinkedItems(shipmentId: string): Promise<boolean> {
    const snap = await this.db
      .collection(SHIPMENT_ITEM_COLLECTION)
      .where("shipmentId", "==", shipmentId)
      .where("linkedProductId", "!=", null)
      .limit(1)
      .get();
    return !snap.empty;
  }

  /**
   * Blocks deletion if any item is still linked to a product — unlink first.
   * Cascade-deleting the shipment's lots/items themselves is handled by the
   * onShipmentDeleted Firestore trigger (Function #3), not here — this keeps
   * the route fast regardless of how many items the shipment had.
   */
  override async delete(shipmentId: string): Promise<void> {
    const linked = await this.hasLinkedItems(shipmentId);
    if (linked) {
      throw new ConflictError(
        `Cannot delete shipment ${shipmentId}: one or more items are still linked to a product. Unlink first.`,
        "SHIPMENT_HAS_LINKED_ITEMS",
      );
    }
    await super.delete(shipmentId);
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    shipmentNumber: { canFilter: true, canSort: true },
    supplierName: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    etaDate: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  async list(model: SieveModel): Promise<FirebaseSieveResult<ShipmentDocument>> {
    return this.sieveQuery<ShipmentDocument>(model, ShipmentsRepository.SIEVE_FIELDS, {
      defaultPageSize: 20,
      maxPageSize: 50,
    });
  }
}

export const shipmentsRepository = new ShipmentsRepository();
