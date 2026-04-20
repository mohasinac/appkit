import type {
  IShippingProvider,
  CreateShipmentInput,
  Shipment,
  TrackingInfo,
  ServiceabilityResult,
} from "../../contracts/shipping";
import {
  shiprocketAuthenticate,
  shiprocketCreateOrder,
  shiprocketGenerateAWB,
  shiprocketGeneratePickup,
  shiprocketTrackByAWB,
  shiprocketCheckServiceability,
  shiprocketGetPickupLocations,
  shiprocketAddPickupLocation,
  shiprocketVerifyPickupOTP,
  isShiprocketTokenExpired,
  SHIPROCKET_TOKEN_TTL_MS,
  type ShiprocketAuthRequest,
  type ShiprocketAddPickupRequest,
  type ShiprocketVerifyPickupOTPRequest,
  type ShiprocketPickupLocation,
  type ShiprocketCreateOrderRequest,
  type ShiprocketTrackActivity,
} from "./index";

// --- Shiprocket Provider Types -------------------------------------------------

export interface ShiprocketProviderConfig {
  email: string;
  password: string;
  /** Cached token — provider will re-authenticate if expired */
  token?: string;
  tokenExpiry?: Date;
  /** Called when the provider refreshes the token so callers can persist it */
  onTokenRefresh?: (token: string, expiry: Date) => void | Promise<void>;
}

// --- Shiprocket Provider Class -------------------------------------------------

/**
 * `IShippingProvider` implementation backed by the Shiprocket REST API.
 *
 * Wraps the standalone HTTP functions with token lifecycle management
 * and maps Shiprocket-specific data shapes to the generic contract types.
 *
 * Register via `ProviderRegistry`:
 * ```ts
 * registry.register("shipping", new ShiprocketProvider(config));
 * ```
 */
export class ShiprocketProvider implements IShippingProvider {
  private token: string | undefined;
  private tokenExpiry: Date | undefined;
  private readonly config: ShiprocketProviderConfig;

  constructor(config: ShiprocketProviderConfig) {
    this.config = config;
    this.token = config.token;
    this.tokenExpiry = config.tokenExpiry;
  }

  // --- Token Management ------------------------------------------------------

  private async ensureToken(): Promise<string> {
    if (this.token && !isShiprocketTokenExpired(this.tokenExpiry)) {
      return this.token;
    }
    const res = await shiprocketAuthenticate({
      email: this.config.email,
      password: this.config.password,
    });
    this.token = res.token;
    this.tokenExpiry = new Date(Date.now() + SHIPROCKET_TOKEN_TTL_MS);
    await this.config.onTokenRefresh?.(this.token, this.tokenExpiry);
    return this.token;
  }

  // --- IShippingProvider -----------------------------------------------------

  async createShipment(data: CreateShipmentInput): Promise<Shipment> {
    const token = await this.ensureToken();

    const orderReq: ShiprocketCreateOrderRequest = {
      order_id: data.orderId,
      order_date: new Date().toISOString().split("T")[0]!,
      pickup_location: data.pickup.name,
      billing_customer_name: data.delivery.name,
      billing_address: data.delivery.addressLine1,
      billing_address_2: data.delivery.addressLine2,
      billing_city: data.delivery.city,
      billing_pincode: data.delivery.pincode,
      billing_state: data.delivery.state,
      billing_country: data.delivery.country,
      billing_email: "",
      billing_phone: data.delivery.phone,
      shipping_is_billing: true,
      order_items: [
        {
          name: data.orderId,
          sku: data.orderId,
          units: 1,
          selling_price: data.codAmount ?? 0,
        },
      ],
      payment_method: data.isCod ? "COD" : "Prepaid",
      sub_total: data.codAmount ?? 0,
      length: data.dimensions.length,
      breadth: data.dimensions.width,
      height: data.dimensions.height,
      weight: data.dimensions.weight,
    };

    const orderRes = await shiprocketCreateOrder(token, orderReq);

    const awbRes = await shiprocketGenerateAWB(token, {
      shipment_id: orderRes.shipment_id,
    });

    await shiprocketGeneratePickup(token, {
      shipment_id: [orderRes.shipment_id],
    });

    return {
      id: String(orderRes.order_id),
      trackingId: awbRes.awb_code,
      orderId: data.orderId,
      status: orderRes.status,
      courier: awbRes.courier_name,
      estimatedDelivery: awbRes.expected_delivery,
      createdAt: new Date().toISOString(),
    };
  }

  async trackShipment(trackingId: string): Promise<TrackingInfo> {
    const token = await this.ensureToken();
    const res = await shiprocketTrackByAWB(token, trackingId);
    const td = res.tracking_data;

    const events = (td.shipment_track_activities ?? []).map(
      (a: ShiprocketTrackActivity) => ({
        status: a.sr_status_label ?? a.status,
        location: a.location,
        timestamp: a.date,
        description: a.activity,
      }),
    );

    return {
      trackingId,
      currentStatus: td.current_status,
      estimatedDelivery: td.shipment_track?.[0]?.edd ?? undefined,
      events,
    };
  }

  async cancelShipment(_shipmentId: string): Promise<void> {
    // Shiprocket cancel API not implemented in HTTP client yet
    throw new Error("cancelShipment not implemented for Shiprocket provider");
  }

  async checkServiceability(
    pincode: string,
    weight: number,
  ): Promise<ServiceabilityResult> {
    const token = await this.ensureToken();
    const res = await shiprocketCheckServiceability(token, {
      pickup_postcode: "",
      delivery_postcode: pincode,
      weight,
    });

    const couriers = (res.data?.available_courier_companies ?? []).map((c) => ({
      name: c.name,
      estimatedDays: parseInt(c.etd, 10) || 0,
      rate: c.rate,
    }));

    return { isServiceable: couriers.length > 0, couriers };
  }

  async generateLabel(_shipmentId: string): Promise<ArrayBuffer> {
    // Shiprocket label API not implemented in HTTP client yet
    throw new Error("generateLabel not implemented for Shiprocket provider");
  }

  // --- Shiprocket-Specific Methods ------------------------------------------

  /** Authenticate and obtain a fresh token. */
  async authenticate(
    credentials?: ShiprocketAuthRequest,
  ): Promise<{ token: string; expiry: Date }> {
    const creds = credentials ?? {
      email: this.config.email,
      password: this.config.password,
    };
    const res = await shiprocketAuthenticate(creds);
    this.token = res.token;
    this.tokenExpiry = new Date(Date.now() + SHIPROCKET_TOKEN_TTL_MS);
    await this.config.onTokenRefresh?.(this.token, this.tokenExpiry);
    return { token: this.token, expiry: this.tokenExpiry };
  }

  /** Get all registered pickup locations. */
  async getPickupLocations(): Promise<ShiprocketPickupLocation[]> {
    const token = await this.ensureToken();
    const res = await shiprocketGetPickupLocations(token);
    return res.shipping_address ?? [];
  }

  /** Add a new pickup location. */
  async addPickupLocation(data: ShiprocketAddPickupRequest) {
    const token = await this.ensureToken();
    return shiprocketAddPickupLocation(token, data);
  }

  /** Verify a pickup location via OTP. */
  async verifyPickupOTP(data: ShiprocketVerifyPickupOTPRequest) {
    const token = await this.ensureToken();
    return shiprocketVerifyPickupOTP(token, data);
  }
}
