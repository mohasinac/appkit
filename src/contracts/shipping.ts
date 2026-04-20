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

// --- Shipping Interface -------------------------------------------------------

/**
 * Shipping carrier adapter contract.
 * Implemented by @mohasinac/shipping-shiprocket, @mohasinac/shipping-shippo,
 * @mohasinac/shipping-easypost.
 */
export interface IShippingProvider {
  createShipment(data: CreateShipmentInput): Promise<Shipment>;
  trackShipment(trackingId: string): Promise<TrackingInfo>;
  cancelShipment(shipmentId: string): Promise<void>;
  checkServiceability(
    pincode: string,
    weight: number,
  ): Promise<ServiceabilityResult>;
  generateLabel(shipmentId: string): Promise<ArrayBuffer>;
}
