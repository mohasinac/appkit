/**
 * Shipment Lots Repository — one doc per lot, FK'd to a shipment.
 */

import {
  BaseRepository,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  SHIPMENT_LOT_COLLECTION,
  SHIPMENT_LOT_FIELDS,
  type ShipmentLot,
  type ShipmentLotCreateInput,
  type ShipmentLotUpdateInput,
} from "../schemas/firestore";

export class ShipmentLotsRepository extends BaseRepository<ShipmentLot> {
  constructor() {
    super(SHIPMENT_LOT_COLLECTION);
  }

  async listByShipment(shipmentId: string): Promise<ShipmentLot[]> {
    const snapshot = await this.getCollection()
      .where(SHIPMENT_LOT_FIELDS.SHIPMENT_ID, "==", shipmentId)
      .orderBy(SHIPMENT_LOT_FIELDS.CREATED_AT, "asc")
      .get();
    return snapshot.docs.map((doc) => this.mapDoc(doc));
  }

  async createLot(shipmentId: string, shipmentStatus: ShipmentLot["shipmentStatus"], input: ShipmentLotCreateInput): Promise<ShipmentLot> {
    return this.create({
      ...input,
      shipmentId,
      shipmentStatus,
      itemCount: 0,
      mainItemsProjectedRevenue: 0,
      customsAllocated: 0,
      shippingAllocated: 0,
      totalLandedCost: input.purchaseCost,
      projectedRevenue: input.remainderEstimatedValue ?? 0,
      projectedProfit: (input.remainderEstimatedValue ?? 0) - input.purchaseCost,
    });
  }

  async updateLot(lotId: string, input: ShipmentLotUpdateInput): Promise<ShipmentLot> {
    return this.update(lotId, input);
  }

  /**
   * Real, paginated, persisted Projections list — one row per lot across
   * every non-cancelled shipment, sorted by whichever computed field the
   * admin picks. Reads the persisted rollup fields only; never recomputes.
   */
  async listForProjections(model: SieveModel): Promise<FirebaseSieveResult<ShipmentLot>> {
    return this.sieveQuery<ShipmentLot>(model, ShipmentLotsRepository.SIEVE_FIELDS, {
      defaultPageSize: 25,
      maxPageSize: 100,
    });
  }

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    shipmentId: { canFilter: true, canSort: false },
    shipmentStatus: { canFilter: true, canSort: false },
    lotName: { canFilter: true, canSort: true },
    projectedProfit: { canFilter: true, canSort: true },
    projectedRevenue: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };
}

export const shipmentLotsRepository = new ShipmentLotsRepository();
