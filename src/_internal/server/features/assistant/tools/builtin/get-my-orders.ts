import { z } from "zod";
import { orderRepository } from "../../../../../../features/orders/repository/orders.repository";
import { defineAssistantTool } from "../define";

/**
 * `getMyOrders` — A3's first PII-bearing tool, and the one that makes this a
 * CUSTOMER assistant rather than a catalogue search bot. "Where is my order"
 * is the question customers actually ask.
 *
 * ## 🛑 Why this is an explicit literal and never a spread
 *
 * `OrderDocument` is the worked example in Part A's "masking by field list is
 * not masking by document" section, and reading the schema confirms every
 * word of it:
 *
 * - **`shippingAddress?: string`** is flat free text and is **deliberately
 *   absent from `ORDER_PII_FIELDS`** — its own comment explains that
 *   encrypting it now would give one field two formats across old and new
 *   rows. So it is a full delivery address sitting in plaintext.
 * - **`deliveryCity` / `deliveryState` / `deliveryPincode` / `deliveryCountry`
 *   are unencrypted ON PURPOSE** — they "decide tax and serviceability and
 *   must stay QUERYABLE". City + state + PIN re-identifies a household on its
 *   own.
 *
 * A `{...order}` spread would publish all of that to a third-party model on
 * the first order with a legacy address. Hence: one object literal, nine named
 * fields, no spread anywhere in this file — which is also what
 * `audit-assistant-egress` R3 checks mechanically.
 *
 * ## 🛑 Why there is no `revealOrders()` here
 *
 * `OrderRepository.mapDoc` is **not** overridden, so reads return exactly
 * what Firestore holds — meaning any encrypted field arrives as `enc:v1:…`.
 * That *looks broken*, and the tempting fix is `orderRepository.revealOrders()`,
 * which decrypts **everything**. That accessor is legitimate for a seller
 * looking at their own dashboard and catastrophic reached from a model-facing
 * tool.
 *
 * The fields below are chosen so the question is answerable WITHOUT decrypting
 * anything: status, dates, totals, item titles and a tracking number are not
 * PII and are never encrypted. Nothing here can return ciphertext, so nothing
 * here needs a decrypt.
 *
 * ## `piiClass: "handle-only"`
 *
 * No raw identifier leaves this tool. The order id is minted as a per-turn,
 * single-use handle (`../handles.ts`), so the model can refer to "your order"
 * and the renderer substitutes the real id — a raw Firestore order id in
 * model context is a stable cross-conversation correlator, which is
 * pseudonymised personal data under DPDP.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

/** Rule #6: a tool must not fan out unbounded. Recent orders answer the question. */
const MAX_ORDERS = 5;
/** Enough to say what the order was, without pasting a whole basket into context. */
const MAX_ITEM_TITLES = 4;

const inputSchema = z.object({
  /** Optional free-text status filter, matched case-insensitively. */
  status: z.string().optional(),
});

export interface MyOrderResult {
  orderHandle: string;
  status: string;
  paymentStatus: string;
  placedOn: string | null;
  itemTitles: readonly string[];
  itemCount: number;
  total: number | null;
  currency: string | null;
  trackingNumber: string | null;
  deliveredOn: string | null;
}

function isoDay(v: unknown): string | null {
  if (!v) return null;
  // Firestore hands back a Timestamp, a Date, or (on some legacy rows) a string.
  const d =
    typeof v === "string"
      ? new Date(v)
      : v instanceof Date
        ? v
        : typeof (v as { toDate?: () => Date }).toDate === "function"
          ? (v as { toDate: () => Date }).toDate()
          : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export const getMyOrdersTool = defineAssistantTool({
  name: "getMyOrders",
  description:
    "Look up the signed-in customer's own recent orders: current status, " +
    "payment status, what was ordered, the total, and a tracking number when " +
    "one exists. Use this for 'where is my order', 'has it shipped', or " +
    "'what did I buy'. Never returns anyone else's orders.",
  inputSchema,
  piiClass: "handle-only",
  execute: async (input, ctx): Promise<readonly MyOrderResult[]> => {
    /*
     * 🛑 Scoped to ctx.userId, which the ROUTE set from the verified session —
     * never from a model-supplied argument. There is deliberately no
     * `userId` field on inputSchema: a tool that accepts one is one
     * hallucinated id away from being a cross-tenant read.
     */
    const orders = await orderRepository.findByUser(ctx.userId);

    const wanted = input.status?.trim().toLowerCase();
    const filtered = wanted
      ? orders.filter((o) => String(o.status).toLowerCase() === wanted)
      : orders;

    const recent = [...filtered]
      .sort((a, b) => (isoDay(b.orderDate) ?? "").localeCompare(isoDay(a.orderDate) ?? ""))
      .slice(0, MAX_ORDERS);

    return recent.map((order) => ({
      // A handle, never the raw id — see the piiClass note above.
      orderHandle: ctx.handles.mint("order", order.id),
      status: String(order.status),
      paymentStatus: String(order.paymentStatus),
      placedOn: isoDay(order.orderDate),
      itemTitles: (order.items ?? []).slice(0, MAX_ITEM_TITLES).map((i) => i.productTitle),
      itemCount: order.items?.length ?? 0,
      total: typeof order.totalPrice === "number" ? order.totalPrice : null,
      currency: typeof order.currency === "string" ? order.currency : null,
      trackingNumber: typeof order.trackingNumber === "string" ? order.trackingNumber : null,
      deliveredOn: isoDay(order.deliveryDate),
    }));
  },
});
