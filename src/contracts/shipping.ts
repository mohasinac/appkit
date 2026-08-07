// --- Shipping Shared Types ----------------------------------------------------

export interface ShippingAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CreateShipmentInput {
  orderId: string;
  dimensions: {
    weight: number; // kg
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  pickup: ShippingAddress;
  delivery: ShippingAddress;
  codAmount?: number;
  isCod?: boolean;
}

export interface Shipment {
  id: string;
  trackingId: string;
  orderId: string;
  status: string;
  courier?: string;
  estimatedDelivery?: string; // ISO-8601
  createdAt: string; // ISO-8601
}

export interface TrackingEvent {
  status: string;
  location: string;
  timestamp: string; // ISO-8601
  description?: string;
}

export interface TrackingInfo {
  trackingId: string;
  currentStatus: string;
  estimatedDelivery?: string; // ISO-8601
  events: TrackingEvent[];
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  couriers: Array<{
    name: string;
    estimatedDays: number;
    rate: number;
  }>;
}

// --- Shipping Contract ------------------------------------------------------

/**
 * Shipping carrier adapter contract. An abstract base class rather than a
 * plain interface so every provider (manual, and any future carrier
 * integration) extends one shared type — adding a new carrier is a
 * subclass, not a fresh reimplementation of the shape.
 *
 * Implemented by the manual provider (default) and its mock.
 */
export abstract class IShippingProvider {
  /** Short discriminator used by admin dev tooling to confirm which provider is registered. */
  abstract readonly name: string;
  abstract createShipment(data: CreateShipmentInput): Promise<Shipment>;
  abstract trackShipment(trackingId: string): Promise<TrackingInfo>;
  abstract cancelShipment(shipmentId: string): Promise<void>;
  abstract checkServiceability(
    pincode: string,
    weight: number,
  ): Promise<ServiceabilityResult>;
  abstract generateLabel(shipmentId: string): Promise<ArrayBuffer>;
}
