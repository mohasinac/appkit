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

/**
 * A courier provider's prepaid balance.
 *
 * 🛑 THREE states, not two, and collapsing them is the whole hazard:
 *
 * - `{ known: false, supported: false }` — this provider has no wallet at all
 *   (manual shipping). Nothing to check, ever.
 * - `{ known: false, supported: true }` — it HAS one and we could not read it
 *   right now (network, malformed payload, auth). **Treat as "attempt the
 *   booking"**: the attempt's own failure is the authority, and refusing on an
 *   unreadable balance would degrade every order on a transient blip.
 * - `{ known: true, amount }` — a real figure.
 *
 * A balance of `0` is the LAST of those, and is a decision to skip. "I could
 * not read it" is not "there is no money".
 *
 * 🛑 There is deliberately NO `creditLimit` field. Measured against the live
 * Shiprocket API 2026-10-22: `GET /account/details/wallet-balance` returns
 * `{ data: { balance_amount: string } }` and nothing else, and
 * `/account/details` is a 404. So postpaid credit is not readable, and a field
 * with no producer is the speculative-infra pattern this codebase refuses.
 * When postpaid is granted, re-probe and add it then.
 */
export type WalletBalance =
  | { known: true; amount: number; currency?: string }
  | { known: false; supported: boolean; reason?: string };

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

  /**
   * The provider's prepaid balance, when it HAS one.
   *
   * 🛑 Deliberately NOT abstract. Manual shipping has no wallet — a seller
   * posts the parcel and claims the cost back — so an abstract member would
   * force every implementation to invent an answer. A non-abstract default is
   * the established shape here for a capability a provider lacks (the dispute
   * contract's `listDisputes() => []` is the precedent).
   *
   * The default says "I do not have one", which is TRUE for manual and is not
   * the same statement as "I have one and it is empty".
   */
  async getWalletBalance(): Promise<WalletBalance> {
    return { known: false, supported: false };
  }
}
