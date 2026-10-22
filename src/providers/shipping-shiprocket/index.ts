/**
 * @mohasinac/shipping-shiprocket — IShippingProvider over Shiprocket's v1 API.
 *
 * ── Read this before trusting it ──────────────────────────────────────────
 *
 * ── What is verified, and what is not ────────────────────────────────────
 *
 * ✅ VERIFIED against the live API (2026-10-20, real API-user credentials):
 *    `POST /v1/external/auth/login` returns HTTP 200 with
 *    `{ company_id, created_at, email, first_name, id, last_name, token }`.
 *    The `token` field is present and non-empty, which is the only field
 *    `loginResponse` requires — the rest are ignored, as Zod ignores unknown
 *    keys by default.
 *
 * ✅ ALSO VERIFIED (2026-10-20): `GET /courier/serviceability/` from pickup
 *    `413001`. HTTP 200, and `data.available_courier_companies` came back with
 *    10-11 entries for Mumbai, Bengaluru and Delhi carrying `courier_name`,
 *    `rate` and `estimated_delivery_days` — so `serviceabilityResponse` below
 *    is read off a real payload, not inferred. It is a read-only quote: no
 *    shipment is created and nothing is booked.
 *
 * 🛑 NOT VERIFIED: order creation, AWB assignment, tracking and label
 *    generation. Each MUTATES or bills a real carrier account — creating an
 *    order can schedule a pickup, an AWB can consume an allocation, a cancel
 *    may still bill — so none was called, and none is discoverable without
 *    incurring it. Their field names below are claims from the published docs,
 *    not facts read off a payload.
 *
 * That asymmetry is the reason every response is parsed through Zod rather
 * than cast: an unverified contract that is wrong surfaces as a named error at
 * the boundary, instead of as an `undefined` AWB written to an order and shown
 * to a buyer as a tracking number that tracks nothing.
 *
 * ── Auth: why a dedicated API user, and why the token is cached ───────────
 *
 * Shiprocket's core v1 API has no long-lived key/secret. You POST credentials
 * to `/v1/external/auth/login` and receive a bearer token valid for roughly
 * ten days, then log in again.
 *
 * 🛑 Those credentials should be a DEDICATED API USER (Shiprocket dashboard →
 * Settings → API → Configure), not the dashboard login. Using the dashboard
 * account means the token dies whenever someone changes that password — a
 * shipping integration that breaks on an unrelated admin action — and it hands
 * full account scope to this process. The env var is named
 * `SHIPROCKET_LOGIN_USER_EMAIL` rather than `LOGIN_ID` because the login payload
 * field is `email`; a var called "login id" invites someone to put a username
 * in it and get a 400 they cannot explain.
 *
 * 🛑 The token is cached in module state with its expiry. Logging in per
 * request would mean two round trips for every shipment and would hit
 * Shiprocket's auth rate limit under any real volume. A 401 mid-flight clears
 * the cache and retries ONCE — exactly once, because a credential that is
 * genuinely wrong must fail fast rather than loop.
 *
 * ── What is deliberately NOT here ────────────────────────────────────────
 *
 * Inbound webhooks. Shiprocket pushes status updates to a URL configured in
 * its dashboard and authenticates them with an `x-api-key` header whose value
 * you set there — a THIRD secret, and an inbound route rather than a provider
 * method. `trackShipment` below polls instead, which is correct for a provider
 * contract and wasteful as a status mechanism; the webhook is the better
 * answer and belongs in its own route with its own verification.
 *
 * @tag domain:shipping
 * @tag layer:providers
 * @tag access:server-only
 */

import { z } from "zod";
import { IShippingProvider } from "../../contracts";
import type {
  CreateShipmentInput,
  Shipment,
  ShippingAddress,
  TrackingInfo,
  ServiceabilityResult,
  WalletBalance,
} from "../../contracts";
import { ApiError } from "../../errors";
import { normalizeError } from "../../errors/normalize";
import { serverLogger } from "../../monitoring/server-logger";

const API_BASE = "https://apiv2.shiprocket.in/v1/external";

export interface ShiprocketConfig {
  /** The API user's email. See the header on why this is not a "login id". */
  email: string;
  password: string;
  /** Shiprocket pickup-location nickname, as registered in their dashboard. */
  pickupLocation?: string;
}

// ── Response contracts ──────────────────────────────────────────────────────
//
// Every one of these is a CLAIM about a payload nobody here has seen. Parsing
// rather than casting is what turns a wrong claim into a named error.

const loginResponse = z.object({
  token: z.string().min(1),
});

const createOrderResponse = z.object({
  order_id: z.union([z.number(), z.string()]),
  shipment_id: z.union([z.number(), z.string()]),
  /** Absent until an AWB is assigned — which is a separate call. */
  awb_code: z.string().nullish(),
  courier_name: z.string().nullish(),
  status: z.string().nullish(),
});

const trackingResponse = z.object({
  tracking_data: z.object({
    shipment_status: z.union([z.number(), z.string()]).nullish(),
    shipment_track: z
      .array(
        z.object({
          current_status: z.string().nullish(),
          delivered_date: z.string().nullish(),
          edd: z.string().nullish(),
        }),
      )
      .nullish(),
    shipment_track_activities: z
      .array(
        z.object({
          date: z.string().nullish(),
          status: z.string().nullish(),
          activity: z.string().nullish(),
          location: z.string().nullish(),
        }),
      )
      .nullish(),
  }),
});

const serviceabilityResponse = z.object({
  data: z.object({
    available_courier_companies: z
      .array(
        z.object({
          courier_name: z.string(),
          estimated_delivery_days: z.union([z.number(), z.string()]).nullish(),
          rate: z.union([z.number(), z.string()]).nullish(),
        }),
      )
      .nullish(),
  }),
});

/*
 * Measured against the live API 2026-10-22 (read-only probe, one auth + GETs):
 *
 *   GET /account/details/wallet-balance -> 200 { data: { balance_amount: string } }
 *   GET /account/details                -> 404
 *
 * 🛑 `balance_amount` is a STRING, and there is NO credit-limit field — so
 * postpaid headroom is not readable from this API at all. See `WalletBalance`
 * in contracts/shipping.ts for why no such field is declared.
 */
const walletBalanceResponse = z.object({
  data: z.object({
    balance_amount: z.union([z.number(), z.string()]).nullish(),
  }),
});

/**
 * Does this upstream error body look like "your wallet is empty"?
 *
 * 🛑 The substring list is UNVERIFIED and that is acceptable, because of where
 * it sits in the design: a funding failure and any other booking failure take
 * the SAME path — the order gets a `courierBlock`, the admin is alerted, the
 * seller is offered retry-or-self-ship. Classifying only changes the WORDING
 * of the operator's alert. So a false negative costs a less specific message
 * and never a wrong action, which is why this is allowed to be a heuristic
 * rather than something this plan pretended to have confirmed.
 *
 * Triggering the real error would mean deliberately booking a shipment against
 * a drained wallet, which is not a probe anyone should run on a live account.
 */
export function looksLikeInsufficientFunds(body: string): boolean {
  const s = body.toLowerCase();
  return (
    s.includes("insufficient") ||
    s.includes("low balance") ||
    s.includes("recharge") ||
    (s.includes("wallet") && s.includes("balance"))
  );
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

/**
 * Parse an upstream response, or throw a named contract error.
 *
 * 🛑 `.parse()`, not `.safeParse()`. The only branch on failure is to throw,
 * and a `safeParse` whose `.success` is checked once and converted straight
 * into a throw is indistinguishable — to a reader and to
 * `audit-unvalidated-safeparse` — from a result nobody handled.
 *
 * 🛑 Logs the FAILING PATHS, never the payload. A Shiprocket response carries
 * the buyer's name, phone and full address, and an error log is the wrong
 * place for all three.
 */
function parseUpstream<T>(contract: z.ZodType<T>, json: unknown, what: string): T {
  try {
    return contract.parse(json);
  } catch (err) {
    // Normalised first, before the value is inspected — audit-catch-normalize
    // is strict-zero and the ZodError branch below reads `err` either way.
    void normalizeError(err);
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => i.path.join("."))
        : [];
    serverLogger.error("shiprocket: response contract mismatch", {
      what,
      issues,
    });
    throw new ApiError(502, `Shiprocket ${what} returned an unexpected shape.`, {
      code: "SHIPROCKET_CONTRACT_MISMATCH",
    });
  }
}

export class ShiprocketShippingProvider extends IShippingProvider {
  readonly name = "shiprocket";

  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ShiprocketConfig) {
    super();
    /*
     * 🛑 Refuses at CONSTRUCTION, not at first use. `providers.config.ts`
     * already argues this: a degraded shipping provider hands back a synthetic
     * tracking id for a parcel no carrier was told about, so the seller sees an
     * AWB-shaped string and a success toast while the buyer gets a number that
     * tracks nothing. A loud failure at boot is attributable and recoverable by
     * flipping one setting; the silent version is neither.
     */
    if (!config.email?.trim() || !config.password?.trim()) {
      throw new Error(
        "[shiprocket] SHIPROCKET_LOGIN_USER_EMAIL / SHIPROCKET_API_PASSWORD are empty. " +
          "Create a dedicated API user in Shiprocket (Settings -> API -> Configure) " +
          "and set both, or set siteSettings.shipping.provider back to 'manual'. " +
          "This refuses rather than degrading because a fallback would return a " +
          "synthetic tracking id for a parcel that was never booked.",
      );
    }
  }

  /**
   * A bearer token, logging in only when the cached one is absent or stale.
   *
   * The 60-second safety margin matters: a token that expires mid-request
   * produces a 401 the caller has to interpret, and shaving a minute off a
   * ten-day lifetime costs nothing.
   */
  private async getToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.token;
    }
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password,
      }),
    });
    if (!res.ok) {
      throw new ApiError(502, `Shiprocket auth failed (${res.status}). Check the API user's credentials.`, { code: "SHIPROCKET_AUTH_FAILED" });
    }
    const parsed = parseUpstream(loginResponse, await res.json(), "auth/login");
    this.token = parsed.token;
    // Their docs say ~10 days; treated as 9 so a boundary never surprises us.
    this.tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;
    return this.token;
  }

  /**
   * One authenticated call, with a single re-auth on 401.
   *
   * 🛑 Exactly one retry. A token that expired early is worth one more attempt;
   * a credential that is wrong must fail rather than loop, because a retry loop
   * against an auth endpoint is how an integration gets rate-limited and then
   * looks like an outage.
   */
  private async call<T>(
    path: string,
    init: RequestInit,
    contract: z.ZodType<T>,
  ): Promise<T> {
    const attempt = async (force: boolean): Promise<Response> => {
      const token = await this.getToken(force);
      return fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
      });
    };

    let res = await attempt(false);
    if (res.status === 401) {
      this.token = null;
      res = await attempt(true);
    }
    if (!res.ok) {
      /*
       * The body is read and carried, not discarded.
       *
       * It used to throw on `res.status` alone, which meant a funding failure
       * and a malformed-address failure were indistinguishable to every
       * caller — and the first of those is the one an operator can actually
       * fix, by topping up.
       *
       * Truncated, because an upstream error page can be a whole HTML
       * document and this string ends up in a log line.
       */
      const body = await res.text().catch(() => "");
      const insufficient = looksLikeInsufficientFunds(body);
      throw new ApiError(
        502,
        `Shiprocket ${path} failed (${res.status}).`,
        {
          code: insufficient ? "SHIPROCKET_INSUFFICIENT_FUNDS" : "SHIPROCKET_REQUEST_FAILED",
          upstreamStatus: res.status,
          upstreamBody: body.slice(0, 500),
        },
      );
    }

    const json: unknown = await res.json();
    return parseUpstream(contract, json, path);
  }

  /** Their order payload wants the address flattened across many keys. */
  private addressFields(prefix: "billing" | "shipping", a: ShippingAddress) {
    const p = prefix === "billing" ? "billing" : "shipping";
    return {
      [`${p}_customer_name`]: a.name,
      [`${p}_address`]: a.addressLine1,
      [`${p}_address_2`]: a.addressLine2 ?? "",
      [`${p}_city`]: a.city,
      [`${p}_pincode`]: a.pincode,
      [`${p}_state`]: a.state,
      [`${p}_country`]: a.country,
      [`${p}_phone`]: a.phone,
    };
  }

  /**
   * 🛑 WIRING A CALLER FOR THIS OWES ONE EXTRA WRITE: set
   * `order.platformBookedShipment = true` in the same commit.
   *
   * That flag is the gate `isReimbursableShipment()`
   * (`_internal/shared/shipping/quote.ts`) uses to decide whether a seller may
   * be reimbursed for postage. It FAILS OPEN — absent means "the seller shipped
   * it themselves", which is correct and deliberate, because a self-shipped
   * parcel has no flag to set and a fail-closed gate would refuse every
   * legitimate claim.
   *
   * Measured 2026-10-21: this method has **no callers**, and the flag has
   * **no writers**. Those two facts cancel out — there are no platform-booked
   * parcels, so nothing is wrongly reimbursed. Wire this without the flag and
   * they stop cancelling out: the platform pays the courier here, then
   * reimburses the seller for that same spend on approval. Postage paid twice,
   * silently, because the gate has no way to know we booked it.
   */
  async createShipment(data: CreateShipmentInput): Promise<Shipment> {
    const body = {
      order_id: data.orderId,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_location: this.config.pickupLocation ?? "Primary",
      ...this.addressFields("billing", data.delivery),
      shipping_is_billing: true,
      /*
       * Shiprocket requires at least one order item. We do not receive the
       * line items on this contract — `CreateShipmentInput` carries only
       * dimensions and the two addresses — so a single synthetic line stands
       * for the parcel. 🛑 This is a known gap, not a simplification: a real
       * integration needs per-item HSN and value for a commercial invoice, and
       * that means widening the shared contract rather than inventing values
       * here.
       */
      order_items: [
        {
          name: `Order ${data.orderId}`,
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

    const out = await this.call(
      "/orders/create/adhoc",
      { method: "POST", body: JSON.stringify(body) },
      createOrderResponse,
    );

    return {
      id: String(out.shipment_id),
      /*
       * 🛑 Falls back to the shipment id when no AWB has been assigned yet —
       * assignment is a separate call. It does NOT invent a `manual_…` string:
       * a synthetic tracking number that a buyer can paste into a courier site
       * and get nothing from is the failure mode this whole provider is
       * supposed to avoid.
       */
      trackingId: out.awb_code?.trim() || String(out.shipment_id),
      orderId: data.orderId,
      status: out.status ?? "created",
      courier: out.courier_name ?? undefined,
      createdAt: new Date().toISOString(),
    };
  }

  async trackShipment(trackingId: string): Promise<TrackingInfo> {
    const out = await this.call(
      `/courier/track/awb/${encodeURIComponent(trackingId)}`,
      { method: "GET" },
      trackingResponse,
    );
    const t = out.tracking_data;
    const head = t.shipment_track?.[0];
    return {
      trackingId,
      currentStatus:
        head?.current_status ?? String(t.shipment_status ?? "unknown"),
      estimatedDelivery: head?.edd ?? undefined,
      events: (t.shipment_track_activities ?? []).map((e) => ({
        status: e.status ?? "",
        location: e.location ?? "",
        timestamp: e.date ?? "",
        description: e.activity ?? undefined,
      })),
    };
  }

  /**
   * The prepaid wallet balance. Read-only; never charges anything.
   *
   * 🛑 Returns `{ known: false, supported: true }` on ANY failure rather than
   * `0`. Shiprocket HAS a wallet, so `supported` is true regardless — the
   * caller must treat "unreadable" as "attempt the booking anyway and let the
   * attempt's own failure decide", because refusing on an unreadable balance
   * would block every order on a transient network blip. A `0` here is a real
   * decision to skip; an unreadable balance is not.
   */
  async getWalletBalance(): Promise<WalletBalance> {
    try {
      const out = await this.call(
        "/account/details/wallet-balance",
        { method: "GET" },
        walletBalanceResponse,
      );
      const raw = out.data.balance_amount;
      /*
       * `num()` would silently fold an unparseable string into its fallback,
       * which is exactly the 0-means-unknown conflation this type exists to
       * prevent. Parsed explicitly so a bad payload reports `known: false`.
       */
      const parsed = typeof raw === "string" ? Number.parseFloat(raw) : raw;
      if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
        return { known: false, supported: true, reason: "unparseable balance_amount" };
      }
      return { known: true, amount: parsed, currency: "INR" };
    } catch (err) {
      const normalized = normalizeError(err);
      return { known: false, supported: true, reason: normalized.message };
    }
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    await this.call(
      "/orders/cancel",
      { method: "POST", body: JSON.stringify({ ids: [shipmentId] }) },
      // Their cancel returns a message envelope we do not read; accepting any
      // object keeps us from asserting a shape we have not seen.
      z.object({}).passthrough(),
    );
  }

  async checkServiceability(
    pincode: string,
    weight: number,
  ): Promise<ServiceabilityResult> {
    /*
     * `pickup_postcode` is required by their API and comes from
     * `SHIPROCKET_PICKUP_PINCODE`.
     *
     * 🛑 This comment used to say "we do not have it on this contract", which
     * was wrong and cost the whole method: the consumer's `appkit.config.js →
     * business.registeredAddress` has carried `postalCode` all along. Nothing
     * set the var, so every call returned `{ isServiceable: false }` WITHOUT
     * calling the API — checkout would have told every buyer we cannot ship to
     * them, for every destination. A quote that is silently always "no" is
     * indistinguishable from a carrier with no coverage, which is why it had no
     * symptom. Verified live once the var was populated: 10-11 couriers quoted
     * from 413001 to Mumbai, Bengaluru and Delhi.
     *
     * 🛑 appkit has no reader for a consumer config file, so the DEFAULT is the
     * consumer's job: `src/providers.config.ts` populates this var from the
     * business block at boot. Deliberately not threaded through
     * `configurePlatformSupplier` — that seam's own 🛑 says it "is NOT a cache
     * of site settings and must not become one"; it answers *who the invoice
     * supplier is*, and a carrier pickup field there is mission creep on a seam
     * with one stated purpose. One var, one reader, no precedence rule.
     */
    const origin = process.env.SHIPROCKET_PICKUP_PINCODE?.trim();
    if (!origin) {
      serverLogger.warn(
        "shiprocket: no pickup postcode — set business.registeredAddress.postalCode in appkit.config.js, or SHIPROCKET_PICKUP_PINCODE directly",
        { pincode },
      );
      return { isServiceable: false, couriers: [] };
    }

    try {
      const out = await this.call(
        `/courier/serviceability/?pickup_postcode=${encodeURIComponent(origin)}` +
          `&delivery_postcode=${encodeURIComponent(pincode)}` +
          `&weight=${encodeURIComponent(String(weight))}&cod=0`,
        { method: "GET" },
        serviceabilityResponse,
      );
      const couriers = (out.data.available_courier_companies ?? []).map((c) => ({
        name: c.courier_name,
        estimatedDays: num(c.estimated_delivery_days),
        rate: num(c.rate),
      }));
      return { isServiceable: couriers.length > 0, couriers };
    } catch (err) {
      void normalizeError(err);
      /*
       * Serviceability is a QUOTE, not a write. Failing closed here means the
       * checkout says "we cannot ship there" on a transient carrier outage,
       * which is wrong in the safe direction — the alternative is quoting a
       * rate we cannot honour.
       */
      return { isServiceable: false, couriers: [] };
    }
  }

  async generateLabel(shipmentId: string): Promise<ArrayBuffer> {
    const out = await this.call(
      "/courier/generate/label",
      { method: "POST", body: JSON.stringify({ shipment_id: [shipmentId] }) },
      z.object({ label_url: z.string().url() }),
    );
    const res = await fetch(out.label_url);
    if (!res.ok) {
      throw new ApiError(502, `Shiprocket label download failed (${res.status}).`, { code: "SHIPROCKET_LABEL_FAILED" });
    }
    return res.arrayBuffer();
  }
}
