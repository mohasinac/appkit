/**
 * @mohasinac/shipping-manual — the default IShippingProvider implementation.
 *
 * There is no carrier API here: the seller enters a carrier name and
 * tracking number/URL directly (see `customShipOrder` in
 * `features/seller/actions/seller-actions.ts`, the actual write path used by
 * the seller ship flow). This class exists so `getProviders().shipping` is
 * always populated with a real implementation of the contract — a future
 * carrier integration (e.g. Shiprocket, Delhivery) is a sibling package that
 * `extends IShippingProvider` the same way this one does, and
 * `providers.config.ts` swaps which one gets registered.
 */

import { IShippingProvider } from "../../contracts";
import type {
  CreateShipmentInput,
  Shipment,
  TrackingInfo,
  ServiceabilityResult,
} from "../../contracts";

export class ManualShippingProvider extends IShippingProvider {
  readonly name = "manual";

  async createShipment(data: CreateShipmentInput): Promise<Shipment> {
    return {
      id: `manual_${data.orderId}`,
      trackingId: data.orderId,
      orderId: data.orderId,
      status: "created",
      createdAt: new Date().toISOString(),
    };
  }

  async trackShipment(trackingId: string): Promise<TrackingInfo> {
    // Manual shipments carry their tracking state on the order document
    // itself (status, trackingNumber, trackingUrl) — there is no carrier
    // API to poll. Callers that need current state should read the order,
    // not this method.
    return { trackingId, currentStatus: "unknown", events: [] };
  }

  async cancelShipment(_shipmentId: string): Promise<void> {
    // No-op — cancelling a manual shipment is an order-status update
    // (orderRepository.cancelOrder), not a carrier API call.
  }

  async checkServiceability(
    _pincode: string,
    _weight: number,
  ): Promise<ServiceabilityResult> {
    // Manual shipping has no carrier-imposed serviceability restriction —
    // the seller decides whether they can fulfil an address.
    return { isServiceable: true, couriers: [] };
  }

  async generateLabel(_shipmentId: string): Promise<ArrayBuffer> {
    throw new Error(
      "Manual shipping does not support automatic label generation — the seller prints their own carrier's label.",
    );
  }
}
