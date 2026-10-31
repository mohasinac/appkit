/**
 * @mohasinac/payment-cashfree — Cashfree Payments PG (Orders API) IPaymentProvider
 *
 * Implements the `IPaymentProvider` contract against Cashfree's PG Orders API
 * using bare `fetch` — **no SDK, no new npm dependency**. Credentials arrive
 * through the constructor, same shape as `payment-manual`, `payment-phonepe`
 * and `payment-razorpay`: no Firestore read, no DB dependency, and no second
 * "deprecated standalone helper" surface that bypasses the provider registry
 * (Root Cause #75).
 *
 * Why this gateway exists alongside the other two: Razorpay and PhonePe both
 * name "Bidding/Auction houses" in their prohibited-merchant lists, and this
 * marketplace's `collector-drop` listing type is competitive bidding. Cashfree's
 * published terms do not name the activity. Which listing types that unblocks is
 * a LATER change — see the plan's Phase 1b — and nothing in this file touches
 * `blockedPaymentMethods`.
 *
 * ## 🛑 Three structural differences every caller must account for
 *
 *   1. **`order_amount` is DECIMAL RUPEES**, not the smallest currency unit.
 *      Every caller in this codebase passes the smallest unit (the create-order
 *      route computes `rupeesToPaise(amountDue)`), and Razorpay/PhonePe both
 *      take it natively. So the conversion happens HERE, at the boundary, in
 *      both directions, through `paiseToRupees`/`rupeesToPaise` — and every
 *      value this class RETURNS stays in the smallest unit so that no consumer
 *      of `PaymentOrder` / `PaymentCapture` / `Refund` changes. A figure in the
 *      wrong unit is indistinguishable from a correct one until somebody reads a
 *      100x amount on an invoice, which is this project's own money-unit
 *      cautionary tale.
 *
 *   2. **There is NO `checkoutUrl`.** Cashfree has no hosted page in this
 *      integration: `POST /pg/orders` returns a `payment_session_id` which its
 *      own browser SDK consumes. It is surfaced as
 *      `PaymentOrder.metadata.paymentSessionId` (see `CASHFREE_SESSION_METADATA_KEY`)
 *      rather than being dressed up as a URL — inventing one would hand the
 *      browser a link that 404s. `checkoutUrl` is therefore deliberately unset,
 *      exactly as `RazorpayProvider` leaves it unset for its client-side modal.
 *
 *   3. **`customer_details.customer_phone` is MANDATORY** and Cashfree validates
 *      its format, so there is no placeholder to fall back on. `createOrder`
 *      refuses without it, naming the field. The caller resolves a real number
 *      (the buyer's delivery address, then their profile) or fails the checkout
 *      before any payment session exists.
 *
 * @example
 * ```ts
 * registerProviders({
 *   payment: new CashfreeProvider({
 *     appId: process.env.CASHFREE_APP_ID!,
 *     secretKey: process.env.CASHFREE_SECRET_KEY!,
 *     environment: (process.env.CASHFREE_ENVIRONMENT as "sandbox" | "production") ?? "sandbox",
 *     webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET,
 *   }),
 * });
 * ```
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { IPaymentProvider } from "../../contracts";
import type {
  PaymentOrder,
  PaymentCapture,
  Refund,
  Dispute,
  GatewayPaymentRecord,
  SettlementVendorInput,
  SettlementVendorResult,
  SplitInstruction,
} from "../../contracts";
import type { JsonValue } from "../../schemas/types";
import { getDefaultCurrency } from "../../core/baseline-resolver";
import { paiseToRupees, rupeesToPaise } from "../../core/money";
import { normalizeError } from "../../errors/normalize";

/**
 * Cashfree's PG orders collection — a path SEGMENT, no leading slash.
 * `request()` owns the join; see its note on why the slash lives there.
 */
const CASHFREE_ORDERS_PATH = "orders";
/*
 * EASY SPLIT lives in its own module, and not only for file length: every fact
 * in it is SPECIFIED, NOT CONFIRMED (the endpoint, the body, the order field,
 * the per-order vendor cap), so isolating it makes correcting any one of them a
 * single edit with no call-site changes. Read that file's header before trusting
 * a split — one of its assumptions fails SILENTLY.
 */
import {
  EASY_SPLIT_VENDORS_PATH,
  MAX_SPLIT_VENDORS_PER_ORDER,
  ORDER_SPLITS_FIELD,
  cashfreeVendorPayload,
  mapCashfreeVendorStatus,
  toOrderSplits,
  type CashfreeVendorEntity,
} from "./easy-split";

// --- Configuration ------------------------------------------------------------

const SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg";
const PRODUCTION_BASE_URL = "https://api.cashfree.com/pg";

/**
 * Cashfree pins breaking changes to a DATE sent in `x-api-version`, so the
 * default is a literal rather than "latest" — an unpinned version means the
 * response shape this adapter maps can change under it without a deploy.
 * Overridable per install via `CashfreeConfig.apiVersion`.
 */
const DEFAULT_API_VERSION = "2023-08-01";

/** Where the `payment_session_id` is published on `PaymentOrder.metadata`. */
export const CASHFREE_SESSION_METADATA_KEY = "paymentSessionId";

export interface CashfreeConfig {
  /**
   * Cashfree's App ID — sent as `x-client-id`.
   *
   * 🛑 NOT publishable. Unlike Razorpay's `keyId`, this is a server credential
   * and must never reach the browser; the browser receives only a
   * `payment_session_id`, which is per-order and short-lived.
   */
  appId: string;
  /** Secret key — sent as `x-client-secret`. Server-only. */
  secretKey: string;
  /** Selects the base URL: sandbox vs production. */
  environment: "sandbox" | "production";
  /**
   * Webhook signing secret from Cashfree's dashboard. Without it
   * `verifyWebhook()` fails closed and returns `false`, same shape as
   * Razorpay's and PhonePe's missing-credential behaviour.
   */
  webhookSecret?: string;
  /** Overrides `x-api-version`. Leave unset unless pinning deliberately. */
  apiVersion?: string;
}

// --- Wire shapes (only the fields this adapter reads) -------------------------

/**
 * Typed STRUCTURALLY, naming only what is mapped, so the mapping is auditable
 * against Cashfree's docs by eye. There is no SDK to import a type from — which
 * is the point: a bare-`fetch` adapter is the whole reason this file needs no
 * dependency.
 */
interface CashfreeOrderEntity {
  cf_order_id?: string | number;
  order_id?: string;
  /** DECIMAL RUPEES. */
  order_amount?: number;
  order_currency?: string;
  /** `ACTIVE` | `PAID` | `EXPIRED` | `TERMINATED` | `TERMINATION_REQUESTED`. */
  order_status?: string;
  payment_session_id?: string;
  created_at?: string;
  order_expiry_time?: string;
  /** Cashfree's merchant passthrough map — see `toOrderTags`. */
  order_tags?: Record<string, string> | null;
}

interface CashfreePaymentEntity {
  cf_payment_id?: string | number;
  order_id?: string;
  /** `SUCCESS` | `NOT_ATTEMPTED` | `FAILED` | `USER_DROPPED` | `VOID` | `PENDING`. */
  payment_status?: string;
  /** DECIMAL RUPEES. */
  payment_amount?: number;
  payment_currency?: string;
  payment_time?: string;
  bank_reference?: string;
}

/* `CashfreeVendorEntity` lives in `./easy-split` with the rest of that surface. */

interface CashfreeRefundEntity {
  cf_refund_id?: string | number;
  refund_id?: string;
  order_id?: string;
  /** DECIMAL RUPEES. */
  refund_amount?: number;
  refund_currency?: string;
  /** `SUCCESS` | `PENDING` | `ONHOLD` | `CANCELLED`. */
  refund_status?: string;
  created_at?: string;
}

// --- Pure helpers -------------------------------------------------------------

/**
 * `order_id` / `refund_id` are OURS, not Cashfree's — both endpoints accept a
 * merchant-supplied id and every later lookup (status, refund, webhook
 * correlation) keys on it. Cashfree's constraint is alphanumeric plus `_`/`-`,
 * at most 50 characters; `<prefix>_` + 24 hex is 28.
 */
function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

/** Cashfree's order vocabulary → the contract's. */
function mapOrderStatus(status: string | undefined): PaymentOrder["status"] {
  switch (status) {
    case "PAID":
      return "paid";
    case "EXPIRED":
    case "TERMINATED":
      return "failed";
    default:
      // `ACTIVE`, `TERMINATION_REQUESTED`, and anything we have not seen.
      // Unknown resolves to "created", which fails toward not concluding a
      // payment happened — the only safe direction on this mapping, because
      // `verifyAndPlaceGatewayOrderAction` gates order placement on "paid".
      return "created";
  }
}

/**
 * `order_tags` is Cashfree's merchant passthrough map, and it is this adapter's
 * equivalent of PhonePe's `metaInfo` and Razorpay's `notes`: the only channel
 * that survives from `createOrder()` through to the order entity AND the webhook
 * payload, which is how the WEBHOOK path — running with no buyer session —
 * recovers whose cart a payment was for (`CheckoutIntentMetadata`).
 *
 * Flattened to a flat string map, dropping arrays and objects rather than
 * letting a nested value reach the API and 400 the whole checkout — the same
 * reasoning (and the same shape) as `toNotes` in the Razorpay adapter.
 *
 * 🛑 The 10-key / 255-char caps below are Cashfree's documented limits as
 * understood at the time of writing and have NOT been exercised against the
 * live API. They are applied as a TRUNCATION rather than an error because a
 * dropped tag costs the webhook a fallback it can recover another way, while a
 * rejected order costs the sale.
 */
const ORDER_TAG_MAX_KEYS = 10;
const ORDER_TAG_MAX_VALUE_CHARS = 255;

function toOrderTags(
  metadata?: Record<string, JsonValue>,
): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue; // no representation in a flat map
    if (Object.keys(tags).length >= ORDER_TAG_MAX_KEYS) break;
    tags[key] = String(value).slice(0, ORDER_TAG_MAX_VALUE_CHARS);
  }
  return Object.keys(tags).length > 0 ? tags : undefined;
}

// --- Webhook signature --------------------------------------------------------

/**
 * Cashfree signs a webhook over BOTH a timestamp header and the raw body, so
 * verification needs two values while `IPaymentProvider.verifyWebhook(payload,
 * signature)` has one slot for them. Rather than widen the shared contract for
 * one gateway, the two are packed into the `signature` argument by a helper this
 * module owns — so both ends of the encoding live in the provider and no call
 * site invents a format.
 *
 * `.` is unambiguous as a separator: the timestamp is digits and the signature
 * is base64 (`A-Za-z0-9+/=`), so the split is at the FIRST `.` and neither half
 * can contain one.
 */
export const CASHFREE_WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";
export const CASHFREE_WEBHOOK_TIMESTAMP_HEADER = "x-webhook-timestamp";
const PACK_SEPARATOR = ".";

/** Packs the two webhook headers into one `signature` argument. */
export function packCashfreeWebhookSignature(
  timestamp: string,
  signature: string,
): string {
  return `${timestamp}${PACK_SEPARATOR}${signature}`;
}

/** Constant-time compare that cannot throw on a length mismatch. */
function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  // `timingSafeEqual` THROWS on differing lengths, which would leak the length
  // through an exception and turn a plain mismatch into a 500. Length is not
  // secret; the bytes are.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * The ONE place a Cashfree webhook signature is computed.
 *
 * 🛑 **ASSUMED, NOT CONFIRMED.** The construction implemented here is
 * `base64(HMAC-SHA256(timestamp + rawBody, webhookSecret))`, compared against
 * the `x-webhook-signature` header with `x-webhook-timestamp` as the timestamp.
 * That is the shape this adapter was specified against; it has **not** been
 * verified against Cashfree's live documentation or a real delivery. Three
 * things in it could each be wrong independently:
 *
 *   · the CONCATENATION ORDER (`timestamp + body` vs `body + timestamp`),
 *   · the SIGNING KEY (the webhook secret vs the API `secretKey`),
 *   · the ENCODING (base64 vs hex).
 *
 * Confirm all three against the live docs before trusting a verified webhook,
 * and prove it both ways: a genuine delivery must verify AND a tampered body
 * must be rejected. A check that has only ever been seen to pass is not
 * evidence (CLAUDE.md Rule #11).
 *
 * It is isolated in this one named function precisely so that correcting the
 * assumption is a one-function edit with no call-site changes.
 *
 * 🛑 FAILS CLOSED on every path — no secret, no signature, no timestamp, a
 * non-numeric timestamp, or a mismatch all return `false`. "I cannot verify
 * this" and "the signature is good" must never collapse into one return value
 * on the call that decides whether a payment is genuine.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  if (!secret || !signature || !timestamp) return false;
  // A timestamp is epoch seconds. Anything else means we are not reading the
  // header we think we are, which is a configuration fault, not a valid call.
  if (!/^\d+$/.test(timestamp)) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp + rawBody, "utf8")
    .digest("base64");
  return signaturesMatch(expected, signature);
}

// --- IPaymentProvider implementation -----------------------------------------

export class CashfreeProvider extends IPaymentProvider {
  readonly name = "cashfree";

  /*
   * 🛑 The reason this adapter exists. Cashfree's published terms
   * (Attachment A, "List of Negative, Risky and Restricted Categories of
   * Business") name gaming/gambling — lottery tickets, sports bets, online
   * gambling enrolment — and do NOT name auctions, bidding, or auction
   * houses anywhere. Razorpay and PhonePe both name "Bidding/Auction houses"
   * explicitly, which is why neither declares these.
   *
   * `random-lots` is included on the owner's framing, recorded here because
   * it is the part a reader will want to challenge: every numbered slot is a
   * named prize with an image (`lotterySlotWriteSchema`), so every buyer
   * receives a real item and nobody pays for nothing. That is consideration
   * buying A GOOD, NOT A CHANCE — a blind box, which is a product sale and
   * sits outside the gambling clause. The `reveal` mode is the same mechanic
   * with the slot chosen for you.
   *
   * 🛑 Verified against the published terms, NOT against a categorisation in
   * writing from Cashfree naming our types. Getting that in writing before
   * real money moves is the outstanding item; a published list is evidence
   * about the policy, not a decision about this merchant.
   */
  override readonly acceptsRestrictedListingTypes = ["collector-drop", "random-lots"] as const;
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly apiVersion: string;
  private readonly webhookSecret?: string;

  constructor(config: CashfreeConfig) {
    super();
    if (!config.appId || !config.secretKey) {
      throw new Error(
        "CashfreeProvider requires appId and secretKey. Configure them in Admin › Site Settings › Credentials, or set CASHFREE_APP_ID / CASHFREE_SECRET_KEY.",
      );
    }
    this.baseUrl =
      config.environment === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
    this.appId = config.appId;
    this.secretKey = config.secretKey;
    this.apiVersion = config.apiVersion?.trim() || DEFAULT_API_VERSION;
    this.webhookSecret = config.webhookSecret;
  }

  /**
   * The single HTTP boundary. Bare `fetch` — the gateway is three endpoints, so
   * an SDK would be a dependency for less code than this method.
   *
   * A non-2xx carries Cashfree's own body into the thrown message (useful: its
   * errors name the offending field) and its status as `httpStatus`, which is
   * what `mapToHttpError` reads. Production scrubs 5xx messages before they
   * reach a buyer, so the detail stays server-side.
   */
  /**
   * One HTTPS call to Cashfree.
   *
   * 🛑 `path` is a SEGMENT, with or without a leading slash — this method owns
   * the join. Callers may therefore name their endpoints without a leading
   * slash, which matters because `no-restricted-syntax` reads a bare
   * `"/orders"` as an APP route that should come from `ROUTES.*`. It is not:
   * it is a third-party API path, and `ROUTES` would be exactly the wrong home
   * for it. Normalising here lets the constants say what they are instead of
   * being spelled around the rule.
   */
  private async request<T>(
    path: string,
    init?: { method?: "GET" | "POST"; body?: unknown },
  ): Promise<T> {
    const method = init?.method ?? "GET";
    const hasBody = init?.body !== undefined;
    const suffix = path.startsWith("/") ? path : `/${path}`;
    const response = await fetch(`${this.baseUrl}${suffix}`, {
      method,
      headers: {
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
        "x-api-version": this.apiVersion,
        accept: "application/json",
        ...(hasBody ? { "content-type": "application/json" } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
    });
    const text = await response.text();
    if (!response.ok) {
      throw Object.assign(
        new Error(
          `Cashfree ${method} ${path} failed (${response.status}): ${text.slice(0, 500)}`,
        ),
        { httpStatus: response.status },
      );
    }
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      /*
       * The parse error itself says only "unexpected token"; what diagnoses
       * this is the BODY, which the thrown error carries. Normalised rather
       * than dropped so the shape matches every other catch in the tree.
       */
      void normalizeError(err);
      throw Object.assign(
        new Error(
          `Cashfree ${method} ${path} returned a non-JSON body (${response.status}): ${text.slice(0, 200)}`,
        ),
        { httpStatus: 502 },
      );
    }
  }

  /**
   * Creates a Cashfree order.
   *
   * `amount` is in the SMALLEST CURRENCY UNIT — what every caller in this
   * codebase passes — and is converted to the decimal rupees Cashfree's
   * `order_amount` expects. The returned `amount` is converted back, so the
   * contract this provider satisfies is identical to Razorpay's and PhonePe's.
   *
   * Required `metadata`:
   *   · `uid`           — becomes `customer_details.customer_id`, and is packed
   *                        into `order_tags` so the webhook can place the order
   *                        with no buyer session.
   *   · `customerPhone` — `customer_details.customer_phone`, MANDATORY at
   *                        Cashfree and format-validated there, so there is no
   *                        placeholder worth sending.
   *
   * Optional: `customerEmail`, `customerName`, `redirectUrl` (becomes
   * `order_meta.return_url`), and anything else the caller wants round-tripped
   * through `order_tags`.
   *
   * 🛑 Returns NO `checkoutUrl`. The browser needs
   * `metadata.paymentSessionId` — see the class header, point 2.
   */
  async createOrder(
    amount: number,
    currency?: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<PaymentOrder> {
    return this.createOrderInternal(amount, currency, metadata);
  }

  /**
   * Creates a Cashfree order whose CAPTURE is split across vendors.
   *
   * 🛑 This is the method the checkout path calls — always, even with no
   * splits. See `IPaymentProvider.createOrderWithSplit` for why there is one
   * call site rather than a choice between two methods.
   *
   * 🛑 Every vendor named in `splits` must already be an `active` Easy Split
   * vendor. That is the CALLER's check (`buildSplitInstructions` refuses to
   * build a split for an unregistered store, and `toOrderSplits` refuses an
   * empty `vendorId`) because the caller is the only place that holds the store
   * documents and can refuse BEFORE a payment session exists.
   *
   * 🛑 Refuses above `MAX_SPLIT_VENDORS_PER_ORDER` and NEVER truncates — see
   * that constant's own 🛑. Dropping the last vendor's split would collect
   * their share into the platform's account and look like a success.
   */
  override async createOrderWithSplit(
    amount: number,
    currency: string,
    metadata?: Record<string, JsonValue>,
    splits?: readonly SplitInstruction[],
  ): Promise<PaymentOrder> {
    if (
      splits &&
      MAX_SPLIT_VENDORS_PER_ORDER > 0 &&
      splits.length > MAX_SPLIT_VENDORS_PER_ORDER
    ) {
      throw Object.assign(
        new Error(
          `This cart needs money settled to ${splits.length} sellers in one payment, ` +
            `and Cashfree accepts at most ${MAX_SPLIT_VENDORS_PER_ORDER} per order. ` +
            `Refusing rather than dropping a seller's share from the split.`,
        ),
        { httpStatus: 409, code: "SPLIT_VENDOR_LIMIT_EXCEEDED" },
      );
    }
    return this.createOrderInternal(amount, currency, metadata, splits);
  }

  /**
   * The one implementation behind both public create methods.
   *
   * Kept private so there is no third way to create a Cashfree order: a second
   * public entry point is a second place a split instruction can be forgotten.
   */
  private async createOrderInternal(
    amount: number,
    currency?: string,
    metadata?: Record<string, JsonValue>,
    splits?: readonly SplitInstruction[],
  ): Promise<PaymentOrder> {
    const uid = metadata?.uid;
    if (typeof uid !== "string" || !uid) {
      throw new Error("CashfreeProvider.createOrder requires metadata.uid");
    }
    const customerPhone = metadata?.customerPhone;
    if (typeof customerPhone !== "string" || !customerPhone.trim()) {
      throw new Error(
        "CashfreeProvider.createOrder requires metadata.customerPhone — Cashfree mandates customer_details.customer_phone and validates its format, so there is no placeholder to send.",
      );
    }
    const resolvedCurrency = currency ?? getDefaultCurrency();
    const orderId = generateId("ord");
    const returnUrl = typeof metadata?.redirectUrl === "string" ? metadata.redirectUrl : undefined;
    const customerEmail =
      typeof metadata?.customerEmail === "string" && metadata.customerEmail
        ? metadata.customerEmail
        : undefined;
    const customerName =
      typeof metadata?.customerName === "string" && metadata.customerName
        ? metadata.customerName
        : undefined;

    const orderTags = toOrderTags(metadata);
    /*
     * 🛑 Built BEFORE the request, so a malformed instruction throws with no
     * payment session created. `toOrderSplits` refuses an unregistered vendor
     * and a non-positive share rather than dropping either from the settlement.
     */
    const orderSplits = splits && splits.length > 0 ? toOrderSplits(splits) : undefined;
    const entity = await this.request<CashfreeOrderEntity>(CASHFREE_ORDERS_PATH, {
      method: "POST",
      body: {
        order_id: orderId,
        // 🛑 DECIMAL RUPEES — the one unit conversion on the way in.
        order_amount: paiseToRupees(amount),
        order_currency: resolvedCurrency,
        customer_details: {
          customer_id: uid,
          customer_phone: customerPhone.trim(),
          ...(customerEmail ? { customer_email: customerEmail } : {}),
          ...(customerName ? { customer_name: customerName } : {}),
        },
        ...(returnUrl ? { order_meta: { return_url: returnUrl } } : {}),
        ...(orderTags ? { order_tags: orderTags } : {}),
        /*
         * 🛑 The split instruction. `ORDER_SPLITS_FIELD` is ASSUMED — see point
         * 2 of the block comment on the Easy Split section, which is the one
         * assumption in this file whose failure mode is SILENT. Prove it
         * against a sandbox order before real money goes through here.
         */
        ...(orderSplits ? { [ORDER_SPLITS_FIELD]: orderSplits } : {}),
      },
    });

    const sessionId = entity.payment_session_id;
    if (!sessionId) {
      // Without it the browser cannot open Cashfree's checkout at all, so an
      // order created without one is not a usable payment session — better a
      // loud failure here than a buyer staring at a page that never opens.
      throw Object.assign(
        new Error(
          `Cashfree created order ${orderId} but returned no payment_session_id — the browser has nothing to open`,
        ),
        { httpStatus: 502 },
      );
    }

    return {
      id: orderId,
      amount: this.toSmallestUnit(entity.order_amount, amount),
      currency: entity.order_currency ?? resolvedCurrency,
      status: mapOrderStatus(entity.order_status),
      metadata: {
        ...(metadata ?? {}),
        [CASHFREE_SESSION_METADATA_KEY]: sessionId,
      },
      createdAt: entity.created_at ?? new Date().toISOString(),
      ...(entity.cf_order_id !== undefined
        ? { gatewayOrderId: String(entity.cf_order_id) }
        : {}),
      ...(entity.order_expiry_time ? { expiresAt: entity.order_expiry_time } : {}),
    };
  }

  /**
   * Converts a Cashfree decimal-rupee figure back to the smallest unit.
   *
   * 🛑 `fallback` is what to use when the gateway echoed no amount at all, and
   * the right value differs per call site — so it is a PARAMETER rather than a
   * constant. `createOrder` passes the amount it asked to be charged, because
   * repeating that is better than a confident wrong figure. `capturePayment`
   * and `getOrder` have nothing truer to offer and pass `0`; that is a known
   * weakness of a missing field rather than a claim the amount was zero, and a
   * `NaN` there (what `Number(undefined)` would give) would propagate silently
   * into arithmetic instead of reading as absent.
   */
  private toSmallestUnit(rupees: number | undefined, fallback: number): number {
    return typeof rupees === "number" && Number.isFinite(rupees)
      ? rupeesToPaise(rupees)
      : fallback;
  }

  /**
   * Registers a seller as an Easy Split vendor.
   *
   * 🛑 IDEMPOTENT BY `PUT`-LIKE SEMANTICS, and that is an ASSUMPTION too. The
   * `vendor_id` is ours (the store slug), so a repeat call names the same
   * vendor — but whether Cashfree treats a second `POST` for a known
   * `vendor_id` as an update, a conflict, or a duplicate has NOT been
   * confirmed. The failure is benign in both directions this adapter can see:
   * a conflict surfaces as a 409 carried into `message` and the job records
   * `rejected`, which an operator reads and acts on. It is called out because
   * the job WILL re-run — jobs retry, and an admin can re-approve a store.
   *
   * 🛑 Returns `pending` for any status it does not recognise, never `active`
   * and never `rejected`. See `mapCashfreeVendorStatus`.
   *
   * 🛑 A NON-2xx IS NOT A THROW HERE, unlike every other method on this class.
   * `request()` throws, so the catch converts it into `outcome: "rejected"`
   * with Cashfree's own body as the message. That is deliberate: the caller is
   * a background job whose job is to RECORD why a store could not be onboarded
   * (blockers #3 and #5 mean refusals are expected and routine), and a throw
   * would make a routine refusal indistinguishable from an outage. The one
   * thing that must never happen is a refusal recorded as a success.
   *
   * 🛑 The thrown message is carried VERBATIM but truncated. Cashfree's errors
   * name the offending field, which is the whole value of surfacing them — and
   * `request()` already caps the body at 500 chars. It describes the
   * DESTINATION the seller supplied; it carries no credential of ours.
   */
  override async registerSettlementVendor(
    input: SettlementVendorInput,
  ): Promise<SettlementVendorResult> {
    if (!input.vendorId) {
      throw Object.assign(
        new Error("CashfreeProvider.registerSettlementVendor requires a vendorId"),
        { httpStatus: 400 },
      );
    }
    try {
      const entity = await this.request<CashfreeVendorEntity>(EASY_SPLIT_VENDORS_PATH, {
        method: "POST",
        body: cashfreeVendorPayload(input),
      });
      const outcome = mapCashfreeVendorStatus(entity.status);
      return {
        gateway: this.name,
        // Echo OUR id back, not Cashfree's echo: a gateway that returned a
        // different id would mean our idempotency key is not the one it keys
        // on, and recording theirs would hide that rather than surface it.
        vendorId: input.vendorId,
        outcome,
        ...(outcome === "active"
          ? {}
          : {
              message:
                entity.message ??
                `Cashfree reported vendor status "${entity.status ?? "(none)"}" — ` +
                  `not yet settleable.`,
            }),
      };
    } catch (err) {
      /*
       * A 4xx from Cashfree IS the answer — the gateway refused this vendor,
       * which is a `rejected` outcome the job records and a seller can act on,
       * not an outage. Normalised first so the message is the same shape every
       * other catch in the tree produces.
       */
      const normalized = normalizeError(err);
      return {
        gateway: this.name,
        vendorId: input.vendorId,
        outcome: "rejected",
        message: normalized.message,
      };
    }
  }

  /**
   * Validates a webhook. `payload` is the RAW request body string; `signature`
   * is the packed `"<timestamp>.<signature>"` value built by
   * `packCashfreeWebhookSignature` from the two Cashfree headers.
   *
   * 🛑 The raw body is what gets verified, never a re-serialised object:
   * `JSON.stringify(JSON.parse(body))` is not guaranteed to reproduce the bytes
   * that were signed.
   *
   * Fails closed when no webhook secret is configured, when the packed value is
   * malformed, or on any mismatch. Reports validity only — the caller parses the
   * body itself after this returns `true`, same as the existing webhook route.
   *
   * See `verifyCashfreeWebhookSignature` for the 🛑 on the unconfirmed signing
   * construction.
   */
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const separatorAt = signature.indexOf(PACK_SEPARATOR);
    if (separatorAt <= 0) return false;
    const timestamp = signature.slice(0, separatorAt);
    const received = signature.slice(separatorAt + PACK_SEPARATOR.length);
    return verifyCashfreeWebhookSignature(
      payload,
      received,
      timestamp,
      this.webhookSecret,
    );
  }

  /**
   * Cashfree has no buyer-present SIGNED callback of Razorpay's shape.
   *
   * Its browser SDK resolves with a result object, but that is not a signed
   * proof of payment — confirmation comes from the Orders API (`getOrder`) or
   * the webhook (`verifyWebhook`). So there is nothing here to verify, and the
   * honest answer is rejection.
   *
   * 🛑 `false`, never `true`. "No signature to check" and "the signature is
   * good" must never collapse into the same return value on the call that
   * decides whether a payment is genuine.
   */
  verifyCheckoutSignature(_payload: Record<string, string>, _secret: string): boolean {
    return false;
  }

  /**
   * Reports the state of the payment behind an order. `orderId` is our own
   * merchant `order_id`.
   *
   * Named `capturePayment` by the contract, but it does NOT capture: Cashfree's
   * Orders flow auto-captures, so a successful payment is already captured by
   * the time anything here runs — the same situation as Razorpay's provider.
   *
   * Reads `GET /orders/{id}/payments` rather than the order itself, because the
   * order entity carries no payment id and this is the one method required to
   * report a `transactionId`. One call, not two.
   *
   * 🛑 `PaymentCapture.status` is only `captured | failed`, so a `PENDING`
   * Cashfree payment maps to `failed` — i.e. "not captured". That is the same
   * narrowing Razorpay's provider applies and it fails toward not concluding
   * money moved; `getOrder()` is the method that can express an in-between
   * state.
   */
  async capturePayment(orderId: string): Promise<PaymentCapture> {
    const payments = await this.request<CashfreePaymentEntity[]>(
      `/orders/${encodeURIComponent(orderId)}/payments`,
    );
    const list = Array.isArray(payments) ? payments : [];
    const succeeded = list.find((p) => p.payment_status === "SUCCESS");
    const payment = succeeded ?? list[list.length - 1];
    if (!payment) {
      throw Object.assign(
        new Error(`Cashfree order ${orderId} has no payment attempts`),
        { httpStatus: 404 },
      );
    }
    return {
      id: String(payment.cf_payment_id ?? orderId),
      orderId: payment.order_id ?? orderId,
      amount: this.toSmallestUnit(payment.payment_amount, 0),
      currency: payment.payment_currency ?? getDefaultCurrency(),
      status: succeeded ? "captured" : "failed",
      capturedAt: payment.payment_time ?? new Date().toISOString(),
      ...(payment.bank_reference
        ? { transactionId: payment.bank_reference }
        : payment.cf_payment_id !== undefined
          ? { transactionId: String(payment.cf_payment_id) }
          : {}),
    };
  }

  /**
   * Initiates a refund. `paymentId` here is actually our original merchant
   * `order_id` — Cashfree refunds are ORDER-keyed
   * (`POST /orders/{order_id}/refunds`), not payment-keyed. The inherited
   * parameter name from `IPaymentProvider` is misleading for this provider and
   * is kept only because the base contract is shared; PhonePe has exactly the
   * same mismatch for the same reason.
   *
   * `amount` is in the smallest currency unit and is REQUIRED: Cashfree's
   * `refund_amount` is mandatory, so there is no whole-order refund shorthand
   * to translate an omitted amount into.
   */
  async refund(paymentId: string, amount?: number): Promise<Refund> {
    if (amount === undefined) {
      throw new Error(
        "CashfreeProvider.refund requires an explicit amount — Cashfree's refund_amount is mandatory and it has no whole-order refund shorthand",
      );
    }
    const refundId = generateId("rfnd");
    const entity = await this.request<CashfreeRefundEntity>(
      `/orders/${encodeURIComponent(paymentId)}/refunds`,
      {
        method: "POST",
        body: {
          refund_id: refundId,
          // 🛑 DECIMAL RUPEES on the way out, smallest unit on the way back.
          refund_amount: paiseToRupees(amount),
        },
      },
    );
    return {
      id: entity.refund_id ?? refundId,
      paymentId,
      amount: this.toSmallestUnit(entity.refund_amount, amount),
      currency: entity.refund_currency ?? getDefaultCurrency(),
      status:
        entity.refund_status === "SUCCESS"
          ? "processed"
          : entity.refund_status === "CANCELLED"
            ? "failed"
            : // `PENDING` and `ONHOLD` are both "not settled yet, not refused".
              "pending",
      createdAt: entity.created_at ?? new Date().toISOString(),
    };
  }

  /**
   * Fetches an order and reports its REAL status. This is the authoritative
   * "was this paid" check — `verifyAndPlaceGatewayOrderAction` gates order
   * placement on `status === "paid"`, so `mapOrderStatus` is load-bearing and
   * an unknown value must never resolve to "paid".
   *
   * `metadata` round-trips whatever `createOrder` put in `order_tags`, which is
   * how the WEBHOOK path (no buyer session) recovers the checkout intent — the
   * same job PhonePe's `metaInfo` and Razorpay's `notes` do. Without it the
   * webhook could confirm a payment and then have no uid to place the order for.
   *
   * 🛑 That `order_tags` is echoed back on the order entity is an ASSUMPTION of
   * the same class as the webhook signature's: confirm it against the live API
   * before relying on the webhook fallback, because the failure mode is a
   * captured payment with no placeable order (the incident class this project
   * already has a write-up for).
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    const entity = await this.request<CashfreeOrderEntity>(
      `/orders/${encodeURIComponent(orderId)}`,
    );
    const tags = entity.order_tags ?? undefined;
    return {
      id: entity.order_id ?? orderId,
      amount: this.toSmallestUnit(entity.order_amount, 0),
      currency: entity.order_currency ?? getDefaultCurrency(),
      status: mapOrderStatus(entity.order_status),
      createdAt: entity.created_at ?? new Date().toISOString(),
      ...(entity.cf_order_id !== undefined
        ? { gatewayOrderId: String(entity.cf_order_id) }
        : {}),
      ...(entity.order_expiry_time ? { expiresAt: entity.order_expiry_time } : {}),
      ...(tags ? { metadata: tags as Record<string, JsonValue> } : {}),
    };
  }

  /*
   * ── RECONCILIATION AND DISPUTES: NOT READABLE THROUGH THIS ADAPTER ─────────
   *
   * Cashfree's PG Orders API — the three endpoints above — is ORDER-KEYED. It
   * exposes no "list my payments in a window" resource and this adapter wraps no
   * dispute resource, so neither question can be answered here.
   *
   * 🛑 So `[]` below means "WE CANNOT SEE THEM", never "there are none", and the
   * distinction decides whether a reconciler may conclude anything. There IS an
   * external ledger behind a Cashfree account; we simply cannot read it in bulk
   * through this surface. A reconciler must therefore treat this gateway as
   * UNRECONCILED rather than reconciled — the same documented limitation PhonePe
   * carries, and for the same reason.
   *
   * This is a limitation of what is wrapped, not a gap being worked: widening it
   * means mapping another Cashfree API, which is its own change with its own
   * verification.
   */

  /**
   * 🛑 `[]` because the wrapped API cannot enumerate payments in a window — not
   * because there are none. See the block comment above; the contract requires
   * the caller to treat an empty list as NO INFORMATION.
   */
  async listPayments(): Promise<GatewayPaymentRecord[]> {
    return [];
  }

  async getDispute(disputeId: string): Promise<Dispute> {
    throw Object.assign(
      new Error(
        `getDispute is not supported by Cashfree through this adapter — the PG Orders API wrapped here exposes no dispute resource, so ${disputeId} cannot be fetched. Use Cashfree's own dashboard.`,
      ),
      { httpStatus: 501 },
    );
  }

  async listDisputes(): Promise<Dispute[]> {
    return [];
  }

  async acceptDispute(disputeId: string, _confirmIrrevocable: true): Promise<Dispute> {
    throw Object.assign(
      new Error(
        `acceptDispute is not supported by Cashfree through this adapter — ${disputeId} must be handled in Cashfree's own dashboard.`,
      ),
      { httpStatus: 501 },
    );
  }
}
