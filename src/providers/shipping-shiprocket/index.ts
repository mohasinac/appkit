/**
 * @mohasinac/shipping-shiprocket — Shiprocket shipping API client
 *
 * Thin HTTP client for the Shiprocket REST API.
 * No credential management — caller is responsible for obtaining and
 * passing the JWT token (see your project's platform auth layer).
 *
 * API base: https://apiv2.shiprocket.in/v1/external
 *
 * @example
 * ```ts
 * import {
 * shiprocketAuthenticate,
 * shiprocketCreateOrder,
 * shiprocketTrackByAWB,
 * } from "@mohasinac/shipping-shiprocket";
 *
 * const { token } = await shiprocketAuthenticate({ email, password });
 * const order = await shiprocketCreateOrder(token, orderData);
 * ```
 */

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// --- Types ---------------------------------------------------------------------

export interface ShiprocketAuthRequest {
  email: string;
  password: string;
}

export interface ShiprocketAuthResponse {
  token: string;
  message: string;
  data?: { id: number; email: string; name: string; company_id: number };
}

export interface ShiprocketPickupLocation {
  id: number;
  pickup_location: string;
  add: string;
  add2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  phone: string;
  email: string;
  name: string;
  phone_verified?: number;
}

export interface ShiprocketPickupLocationsResponse {
  shipping_address: ShiprocketPickupLocation[];
}

export interface ShiprocketAddPickupRequest {
  pickup_location: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
}

export interface ShiprocketAddPickupResponse {
  success: boolean;
  address?: {
    pickup_location_id: number;
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
  };
  message?: string;
}

export interface ShiprocketVerifyPickupOTPRequest {
  otp: number;
  pickup_location_id: number;
}

export interface ShiprocketVerifyPickupOTPResponse {
  success: boolean;
  message: string;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: string;
  hsn?: number;
}

export interface ShiprocketCreateOrderRequest {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_state?: string;
  shipping_country?: string;
  shipping_phone?: string;
  order_items: ShiprocketOrderItem[];
  payment_method: "Prepaid" | "COD";
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface ShiprocketCreateOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now: boolean;
  awb_code?: string;
  courier_company_id?: number;
  courier_name?: string;
}

export interface ShiprocketGenerateAWBRequest {
  shipment_id: number;
  courier_id?: number;
}

export interface ShiprocketAWBResponse {
  awb_code: string;
  courier_company_id: number;
  courier_name: string;
  shipment_id: number;
  assigned_date_time: string;
  expected_delivery: string;
  tracking_url?: string;
}

export interface ShiprocketGeneratePickupRequest {
  shipment_id: number[];
  pickup_date?: string[];
}

export interface ShiprocketPickupResponse {
  pickup_scheduled_date?: string;
  pickup_token_number?: string;
  status: number;
  others?: string;
}

export interface ShiprocketTrackActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  sr_status?: string;
  sr_status_label?: string;
}

export interface ShiprocketShipmentTrack {
  id: number;
  awb_code: string;
  courier_company_id: number;
  shipment_id: number;
  order_id: number;
  pickup_date?: string;
  delivered_date?: string;
  weight: string;
  current_status: string;
  edd?: string;
  shipment_track_activities: ShiprocketTrackActivity[];
}

export interface ShiprocketTrackingResponse {
  tracking_data: {
    awb_track_url: string;
    track_url: string;
    current_status: string;
    current_status_id: number;
    shipment_status: number;
    shipment_track: ShiprocketShipmentTrack[];
    shipment_track_activities: ShiprocketTrackActivity[];
    error?: string;
    cod?: boolean;
  };
}

export interface ShiprocketCourierServiceabilityResponse {
  data?: {
    available_courier_companies: Array<{
      id: number;
      name: string;
      etd: string;
      rate: number;
      cod_charges?: number;
    }>;
  };
  status: number;
  message?: string;
}

export interface ShiprocketCancelOrderResponse {
  message: string;
  status: number;
}

export interface ShiprocketOrderDetailResponse {
  data?: {
    shipments?: Array<{
      id: number;
      awb: string;
      status: string;
    }>;
  };
}

export interface ShiprocketLabelResponse {
  label_created: number;
  label_url: string;
  others?: string;
}

export interface ShiprocketWebhookPayload {
  awb: string;
  order_id: string;
  shipment_id: string;
  current_status: string;
  current_status_id: number;
  courier_agent_assigned?: boolean;
  etd?: string;
  pickup_generated?: boolean;
}

// --- Internal fetch helper ----------------------------------------------------

async function shiprocketFetch<T>(
  endpoint: string,
  options: Omit<RequestInit, "headers"> & {
    token?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const { token, headers = {}, ...rest } = options;
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers: reqHeaders,
  });

  const text = await response.text();
  // audit-unknown-ok: Shiprocket HTTP response — third-party JSON
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Shiprocket API non-JSON response ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    const message =
      (json as { message?: string })?.message ??
      `Shiprocket API error ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

// --- Re-export Provider Class -------------------------------------------------

export { ShiprocketProvider } from "./shiprocket-provider";
export type { ShiprocketProviderConfig } from "./shiprocket-provider";

// --- API Functions (prefer ShiprocketProvider class for new code) -------------

/**
 * @deprecated Use `ShiprocketProvider.authenticate()` instead.
 * @internal
 */
export async function shiprocketAuthenticate(
  credentials: ShiprocketAuthRequest,
): Promise<ShiprocketAuthResponse> {
  return shiprocketFetch<ShiprocketAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * @deprecated Use `ShiprocketProvider.getPickupLocations()` instead.
 * @internal
 */
export async function shiprocketGetPickupLocations(
  token: string,
): Promise<ShiprocketPickupLocationsResponse> {
  return shiprocketFetch<ShiprocketPickupLocationsResponse>(
    "/settings/company/pickup",
    { token },
  );
}

/**
 * @deprecated Use `ShiprocketProvider.addPickupLocation()` instead.
 * @internal
 */
export async function shiprocketAddPickupLocation(
  token: string,
  data: ShiprocketAddPickupRequest,
): Promise<ShiprocketAddPickupResponse> {
  return shiprocketFetch<ShiprocketAddPickupResponse>(
    "/settings/company/addpickup",
    { method: "POST", token, body: JSON.stringify(data) },
  );
}

/**
 * @deprecated Use `ShiprocketProvider.verifyPickupOTP()` instead.
 * @internal
 */
export async function shiprocketVerifyPickupOTP(
  token: string,
  data: ShiprocketVerifyPickupOTPRequest,
): Promise<ShiprocketVerifyPickupOTPResponse> {
  return shiprocketFetch<ShiprocketVerifyPickupOTPResponse>(
    "/settings/company/verifyOtpForPickup",
    { method: "POST", token, body: JSON.stringify(data) },
  );
}

/**
 * @deprecated Use `ShiprocketProvider.createShipment()` instead.
 * @internal
 */
export async function shiprocketCreateOrder(
  token: string,
  order: ShiprocketCreateOrderRequest,
): Promise<ShiprocketCreateOrderResponse> {
  return shiprocketFetch<ShiprocketCreateOrderResponse>(
    "/orders/create/adhoc",
    { method: "POST", token, body: JSON.stringify(order) },
  );
}

/**
 * @deprecated Use `ShiprocketProvider.createShipment()` instead (generates AWB internally).
 * @internal
 */
export async function shiprocketGenerateAWB(
  token: string,
  params: ShiprocketGenerateAWBRequest,
): Promise<ShiprocketAWBResponse> {
  return shiprocketFetch<ShiprocketAWBResponse>("/courier/assign/awb", {
    method: "POST",
    token,
    body: JSON.stringify(params),
  });
}

/**
 * @deprecated Use `ShiprocketProvider.createShipment()` instead (schedules pickup internally).
 * @internal
 */
export async function shiprocketGeneratePickup(
  token: string,
  params: ShiprocketGeneratePickupRequest,
): Promise<ShiprocketPickupResponse> {
  return shiprocketFetch<ShiprocketPickupResponse>("/courier/generate/pickup", {
    method: "POST",
    token,
    body: JSON.stringify(params),
  });
}

/**
 * @deprecated Use `ShiprocketProvider.trackShipment()` instead.
 * @internal
 */
export async function shiprocketTrackByAWB(
  token: string,
  awb: string,
): Promise<ShiprocketTrackingResponse> {
  return shiprocketFetch<ShiprocketTrackingResponse>(
    `/courier/track/awb/${awb}`,
    { token },
  );
}

/**
 * @deprecated Use `ShiprocketProvider.checkServiceability()` instead.
 * @internal
 */
export async function shiprocketCheckServiceability(
  token: string,
  paramsOrPickup:
    | {
        pickup_postcode: string;
        delivery_postcode: string;
        weight: number;
        cod?: 0 | 1;
      }
    | string,
  deliveryPostcode?: string,
  weight?: number,
  cod = false,
): Promise<ShiprocketCourierServiceabilityResponse> {
  const params =
    typeof paramsOrPickup === "string"
      ? {
          pickup_postcode: paramsOrPickup,
          delivery_postcode: deliveryPostcode ?? "",
          weight: weight ?? 0,
          cod: cod ? 1 : 0,
        }
      : paramsOrPickup;

  const sp = new URLSearchParams();
  sp.set("pickup_postcode", params.pickup_postcode);
  sp.set("delivery_postcode", params.delivery_postcode);
  sp.set("weight", String(params.weight));
  if (params.cod !== undefined) sp.set("cod", String(params.cod));
  return shiprocketFetch<ShiprocketCourierServiceabilityResponse>(
    `/courier/serviceability/?${sp.toString()}`,
    { token },
  );
}

/**
 * Cancel one or more Shiprocket orders by their order IDs.
 * @deprecated Use `ShiprocketProvider.cancelShipment()` instead.
 * @internal
 */
export async function shiprocketCancelOrder(
  token: string,
  orderIds: number[],
): Promise<ShiprocketCancelOrderResponse> {
  return shiprocketFetch<ShiprocketCancelOrderResponse>("/orders/cancel", {
    method: "POST",
    token,
    body: JSON.stringify({ ids: orderIds }),
  });
}

/**
 * Fetch full order details (including nested shipment IDs) for a Shiprocket order.
 * @deprecated Use `ShiprocketProvider.generateLabel()` instead (calls this internally).
 * @internal
 */
export async function shiprocketGetOrderDetail(
  token: string,
  orderId: number,
): Promise<ShiprocketOrderDetailResponse> {
  return shiprocketFetch<ShiprocketOrderDetailResponse>(
    `/orders/show/${orderId}`,
    { token },
  );
}

/**
 * Request a shipping label PDF for one or more Shiprocket shipment IDs.
 * Returns a label URL — fetch that URL separately to get the raw PDF bytes.
 * @deprecated Use `ShiprocketProvider.generateLabel()` instead.
 * @internal
 */
export async function shiprocketPrintLabel(
  token: string,
  shipmentIds: number[],
): Promise<ShiprocketLabelResponse> {
  return shiprocketFetch<ShiprocketLabelResponse>("/orders/print/label", {
    method: "POST",
    token,
    body: JSON.stringify({ shipment_id: shipmentIds }),
  });
}

/** Shiprocket tokens are valid for approx. 10 days */
export const SHIPROCKET_TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

export function isShiprocketTokenExpired(expiry: Date | undefined): boolean {
  if (!expiry) return true;
  return new Date() >= new Date(expiry);
}

/**
 * Public tracking URL Shiprocket exposes for every AWB. All consumers that
 * record `trackingUrl` on an order should build it via this helper so the
 * base URL stays single-source-of-truth.
 */
export const SHIPROCKET_TRACKING_URL_BASE = "https://shiprocket.co/tracking";

export function buildShiprocketTrackingUrl(awb: string): string {
  return `${SHIPROCKET_TRACKING_URL_BASE}/${encodeURIComponent(awb)}`;
}

/** Status saved on an order immediately after pickup is generated. */
export const SHIPROCKET_STATUS_PICKUP_SCHEDULED = "Pickup Scheduled";
