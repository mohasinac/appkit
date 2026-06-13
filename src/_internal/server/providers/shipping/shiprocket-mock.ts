/**
 * `MockShiprocketProvider` — in-process mock implementing `IShippingProvider`.
 *
 * Replaces the orphaned `/api/dev/mock-shiprocket/**` HTTP routes (deleted
 * in Track H). State is per-process; status progression is deterministic so
 * tests can assert against a known sequence.
 */

import { randomBytes } from "node:crypto";
import type {
  CreateShipmentInput,
  IShippingProvider,
  ServiceabilityResult,
  Shipment,
  TrackingEvent,
  TrackingInfo,
} from "../../../../contracts";

const PICKUP_SCHEDULED = "Pickup Scheduled" as const;

const TRACKING_PROGRESSION: readonly string[] = [
  PICKUP_SCHEDULED,
  "Pickup Completed",
  "In Transit",
  "Out for Delivery",
  "Delivered",
];

interface MockShipment {
  readonly id: string;
  readonly trackingId: string;
  readonly orderId: string;
  readonly courier: string;
  readonly createdAt: string;
  events: TrackingEvent[];
}

export type ShipmentEvent =
  | "Pickup Scheduled"
  | "Pickup Completed"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export type ShipmentEventSink = (
  trackingId: string,
  event: ShipmentEvent,
  shipment: Shipment,
) => Promise<void> | void;

export class MockShiprocketProvider implements IShippingProvider {
  readonly name = "shiprocket-mock" as const;
  private readonly shipments = new Map<string, MockShipment>();
  private eventSink: ShipmentEventSink | null = null;

  setEventSink(sink: ShipmentEventSink | null): void {
    this.eventSink = sink;
  }

  async createShipment(data: CreateShipmentInput): Promise<Shipment> {
    const trackingId = `MOCK${randomBytes(5).toString("hex").toUpperCase()}`;
    const id = `shp_mock_${randomBytes(8).toString("hex")}`;
    const courier = "MockExpress";
    const initialEvent: TrackingEvent = {
      status: PICKUP_SCHEDULED,
      location: data.pickup.city,
      timestamp: new Date().toISOString(),
      description: "Pickup scheduled with carrier",
    };
    this.shipments.set(trackingId, {
      id,
      trackingId,
      orderId: data.orderId,
      courier,
      createdAt: initialEvent.timestamp,
      events: [initialEvent],
    });
    return {
      id,
      trackingId,
      orderId: data.orderId,
      status: initialEvent.status,
      courier,
      createdAt: initialEvent.timestamp,
    };
  }

  async trackShipment(trackingId: string): Promise<TrackingInfo> {
    const shipment = this.shipments.get(trackingId);
    if (!shipment) {
      throw Object.assign(new Error(`Mock shipment not found: ${trackingId}`), {
        httpStatus: 404,
      });
    }
    return {
      trackingId,
      currentStatus: shipment.events[shipment.events.length - 1]?.status ?? "Unknown",
      events: [...shipment.events],
    };
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    const entry = this.findShipmentById(shipmentId);
    if (!entry) {
      throw Object.assign(new Error(`Mock shipment not found: ${shipmentId}`), {
        httpStatus: 404,
      });
    }
    const [trackingId, ship] = entry;
    ship.events.push({
      status: "Cancelled",
      location: ship.events[ship.events.length - 1]?.location ?? "Origin",
      timestamp: new Date().toISOString(),
      description: "Mock shipment cancelled",
    });
    await this.notifyCancellation(trackingId, ship);
  }

  private findShipmentById(shipmentId: string): [string, MockShipment] | null {
    for (const entry of this.shipments) {
      if (entry[1].id === shipmentId) return entry;
    }
    return null;
  }

  private async notifyCancellation(trackingId: string, ship: MockShipment): Promise<void> {
    if (!this.eventSink) return;
    await this.eventSink(trackingId, "Cancelled", {
      id: ship.id,
      trackingId,
      orderId: ship.orderId,
      status: "Cancelled",
      courier: ship.courier,
      createdAt: ship.createdAt,
    });
  }

  async checkServiceability(
    pincode: string,
    weight: number,
  ): Promise<ServiceabilityResult> {
    // Mock policy: every pincode is serviceable; rate scales with weight.
    return {
      isServiceable: true,
      couriers: [
        { name: "MockExpress", estimatedDays: 3, rate: Math.round(60 + weight * 25) },
        { name: "MockEconomy", estimatedDays: 5, rate: Math.round(40 + weight * 18) },
      ],
    };
  }

  async generateLabel(shipmentId: string): Promise<ArrayBuffer> {
    void shipmentId;
    // Mock label: a tiny PDF-like blob. Production tests never read the
    // bytes — they assert the API contract returns an ArrayBuffer.
    const placeholder = new TextEncoder().encode(`%PDF-MOCK\n${shipmentId}\n`);
    return placeholder.buffer.slice(
      placeholder.byteOffset,
      placeholder.byteOffset + placeholder.byteLength,
    );
  }

  /**
   * Mocks-only — advance a shipment's tracking status and fire a tracking
   * event through the consumer-registered sink. Used by
   * `/api/admin/dev/emit-shipping-event` to drive end-to-end test flows.
   */
  async emitTrackingEvent(
    trackingId: string,
    event: ShipmentEvent,
  ): Promise<void> {
    const shipment = this.shipments.get(trackingId);
    if (!shipment) {
      throw new Error(`Mock shipment not found: ${trackingId}`);
    }
    if (!this.eventSink) {
      throw new Error(
        "MockShiprocketProvider.emitTrackingEvent called with no sink registered. " +
          "Call provider.setEventSink(handler) at startup.",
      );
    }
    if (event !== "Cancelled" && !TRACKING_PROGRESSION.includes(event)) {
      throw new Error(`Unknown tracking event: ${event}`);
    }
    const last = shipment.events[shipment.events.length - 1];
    const trackingEvent: TrackingEvent = {
      status: event,
      location: last?.location ?? "Origin",
      timestamp: new Date().toISOString(),
      description: `Mock event: ${event}`,
    };
    shipment.events.push(trackingEvent);
    await this.eventSink(trackingId, event, {
      id: shipment.id,
      trackingId,
      orderId: shipment.orderId,
      status: event,
      courier: shipment.courier,
      createdAt: shipment.createdAt,
    });
  }
}
