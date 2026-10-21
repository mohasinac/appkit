/**
 * Pure checkout line-item math shared between the checkout server actions
 * and its test suite. No framework or Firestore imports — safe to unit test
 * directly, unlike `checkout/actions.ts` whose module graph pulls in
 * `server-only` guards that fail outside a real server-action test harness.
 */
import type { CartItemDocument, CartLineKind, CartLineMember } from "../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../features/products/schemas/firestore";
import { roundRupees } from "../../../utils/number.formatter";
import { calculateGstInclusive, taxableFromInclusive } from "../fees/calculator";

/**
 * Exactly the fields `unitPriceFor` reads.
 *
 * Deliberately narrower than `CartItemDocument`, which a client cannot satisfy:
 * `checkoutDeadline` is a `Date` on the document and a string once the cart has
 * been through `JSON.parse`. Without this seam the checkout page would have to
 * hand-roll a seventh copy of the pricing rule — the exact thing the docstring
 * below spends a paragraph forbidding. `CartItemDocument` is structurally
 * assignable to it, so every existing server call site is unaffected.
 */
export interface PricedCartLine {
  price: number;
  quantity: number;
  lockedPrice?: number;
  lineKind?: CartLineKind;
  bundleCategorySlug?: string;
  bundleProductIds?: string[];
  groupMembers?: Array<{ unitPrice: number; quantity: number }>;
}

/**
 * The single source of truth for "what do we charge for ONE COPY of this line".
 *
 * Four cases, in priority order:
 *
 *  1. **A locked price** — an accepted offer or a won auction. `lockedPrice` is
 *     the negotiated/won amount and it OVERRIDES the current listing price, which
 *     is the whole point of the negotiation. Until 2026-08-21 none of the five
 *     copies of this function looked at `lockedPrice`, so an accepted offer was
 *     billed at the seller's listed price while the cart UI displayed the agreed
 *     one (`item.lockedPrice ?? item.price`) — the buyer saw ₹X and paid ₹Y.
 *  2. **A bundle line** — `item.price` is the bundle's own locked price, which
 *     is deliberately LESS than the sum of its members. Checked before the
 *     members branch for exactly that reason. Covers both modern bundle lines
 *     (`lineKind: "bundle"`) and legacy ones (SB-UNI-5 2026-05-13).
 *  3. **A grouped line** — the sum of its members' own snapshotted prices,
 *     weighted by each member's per-copy quantity. A `"group"` line pins
 *     `item.quantity` to 1, so this is both the unit price and the line total;
 *     see the invariant on `CartLineMember`.
 *  4. **Everything else** — the live Firestore price, so a stale cart-cached
 *     price is never charged on a COD/UPI order.
 *
 * `product` may be null for a locked line whose listing has since been archived;
 * the locked price is still owed, so that case must not dereference `product`.
 *
 * 🛑 Do not hand-roll this rule at a call site. It has been re-derived by hand
 * six times, and the two copies that lived in the consumer repo
 * (`src/app/api/payment/create-order/route.ts`) each reproduced the bundle
 * branch while silently omitting case 1 — so the gateway captured the LIST price
 * for an accepted offer while the cart displayed the negotiated one. Call
 * `lineTotalFor` and let this function stay the only definition.
 */
export function unitPriceFor(item: PricedCartLine, product: ProductDocument | null): number {
  if (typeof item.lockedPrice === "number" && item.lockedPrice > 0) {
    return item.lockedPrice;
  }
  // A BUNDLE is priced as a whole, and that price is the entire point of it
  // being a bundle — it is deliberately less than the sum of its members. This
  // branch must come BEFORE the members branch: a bundle line carries
  // `groupMembers` too (so the cart can show what's inside and checkout can
  // prorate GST), and summing them would silently charge the undiscounted total.
  if (item.lineKind === "bundle" || (item.bundleCategorySlug && item.bundleProductIds?.length)) {
    return item.price;
  }
  // A GROUP line has no price of its own — it is exactly what the buyer picked.
  if (item.groupMembers?.length) {
    return roundRupees(
      item.groupMembers.reduce((sum, m) => sum + m.unitPrice * m.quantity, 0),
    );
  }
  // Null-safe fallback: one of the four call sites this replaced (the cart
  // summary/preview path) already guarded with `product?.price ?? item.price`,
  // and collapsing onto a non-null assertion would have regressed it into a
  // crash whenever a cart line outlives its listing.
  return product?.price ?? item.price;
}

/**
 * What this line contributes to a subtotal: one copy's price × the number of
 * copies. THE call site should use this rather than multiplying `unitPriceFor`
 * itself — that multiplication is where the six hand-rolled copies diverged.
 */
export function lineTotalFor(item: PricedCartLine, product: ProductDocument | null): number {
  return unitPriceFor(item, product) * item.quantity;
}

/** One taxable slice of a line. A single-product line has exactly one. */
export interface LineTaxComponent {
  productId: string;
  /** Rupees this slice is taxed on. Slices of a line sum to its line total. */
  taxable: number;
  gstRate: number;
  hsnCode?: string;
}

/**
 * Split a line into its taxable slices.
 *
 * GST cannot go through `unitPriceFor`: that returns a scalar, and a
 * multi-member line genuinely has SEVERAL rates — a ₹200 sticker at 12% next to
 * a ₹2,000 top at 18% inside one selection. A scalar can only ever carry one of
 * them, which is why a bundle line has paid **zero** GST for its whole
 * existence: `previewCheckoutPricing` looked its product up by `item.productId`,
 * which on a bundle is a CATEGORY id, so `product` was null and
 * `product?.gstRate ?? 0` quietly resolved to 0.
 *
 * Three shapes:
 *
 *  - **Plain line** — one slice, taxed on the whole line total. Identical to
 *    what the two GST loops did before.
 *  - **Grouped line** — one slice per member, each taxed on its own
 *    `unitPrice × member.quantity × item.quantity`. Slices sum to the line
 *    total exactly, because a grouped line has no price of its own.
 *  - **Bundle line** — the taxable base is the bundle's LOCKED price, not the
 *    sum of the members' list prices, so each member's slice is a prorated
 *    share of it (see `allocateBundlePrice`). Charging tax on the undiscounted
 *    total would tax the buyer on money they never paid.
 *
 * `productById` supplies the live `gstRate`; each member's snapshotted rate is
 * the fallback for a member whose listing has since been archived.
 */
export function lineTaxComponentsFor(
  item: CartItemDocument,
  /*
   * Tolerates a null value, and always did — every read below is
   * `?.gstRate ?? 0` / `?? null`. The type was merely narrower than the
   * behaviour, which forced the consumer's create-order route (whose
   * `findById` map is honestly `| null`) to cast. `lineTotalFor` already
   * declares `ProductDocument | null` for the same reason.
   *
   * 🛑 Caveat worth knowing: a MISSING product yields `gstRate ?? 0`, and
   * since 2026-10-10 a 0 rate is accumulated into `exemptAmount` — so an
   * unloadable product would be reported as exempt rather than as unknown.
   * Every caller validates products before reaching here (the route throws on
   * a missing or unpublished one), so this is theoretical; it would stop being
   * theoretical if a caller ever skipped that check.
   */
  productById: Map<string, ProductDocument | null>,
): LineTaxComponent[] {
  const lineTotal = lineTotalFor(item, productById.get(item.productId) ?? null);

  const members = item.groupMembers;
  if (!members?.length) {
    const product = productById.get(item.productId);
    return [{
      productId: item.productId,
      taxable: lineTotal,
      gstRate: product?.gstRate ?? 0,
      hsnCode: product?.hsnCode,
    }];
  }

  const rateFor = (m: CartLineMember) => productById.get(m.productId)?.gstRate ?? m.gstRate ?? 0;
  const hsnFor = (m: CartLineMember) => productById.get(m.productId)?.hsnCode ?? m.hsnCode;

  const isBundle = item.lineKind === "bundle" || Boolean(item.bundleCategorySlug);
  if (!isBundle) {
    return members.map((m) => ({
      productId: m.productId,
      taxable: roundRupees(m.unitPrice * m.quantity * item.quantity),
      gstRate: rateFor(m),
      hsnCode: hsnFor(m),
    }));
  }

  const shares = allocateAcrossMembers(
    lineTotal,
    members.map((m) => m.unitPrice * m.quantity),
  );
  return members.map((m, i) => ({
    productId: m.productId,
    taxable: shares[i],
    gstRate: rateFor(m),
    hsnCode: hsnFor(m),
  }));
}

/**
 * Total GST for one order group, and the base it was charged on.
 *
 * Exists so `createOrderForGroup` (what the buyer is CHARGED) and
 * `previewCheckoutPricing` (what the buyer is SHOWN) cannot disagree. They were
 * two hand-written loops, and Root Cause #59 is precisely the pattern of fixing
 * one and not the other — here that would mean quoting one tax figure and
 * charging another.
 */
export function sumGroupGst(
  items: readonly CartItemDocument[],
  /* `| null` to match `lineTaxComponentsFor` and `lineTotalFor` — see the note
   * there. The consumer's create-order route holds an honestly-nullable map. */
  productById: Map<string, ProductDocument | null>,
  intraState: boolean,
  /**
   * G1 — the group's coupon discount, in decimal rupees. **Reduces the taxable
   * value**, prorated across the group's tax slices.
   *
   * 🛑 WHY THIS PARAMETER EXISTS. Without it the tax was backed out of the
   * UNDISCOUNTED gross, so on a ₹1,000 item @18% with a ₹200 coupon the order
   * recorded taxable ₹847.46 + GST ₹152.54 = ₹1,000 while the buyer paid ₹800
   * for the goods. **₹30.51 of tax recorded on money that was never
   * collected** — remitted by us, on every discounted order.
   *
   * A discount shown on the invoice generally reduces the value of supply
   * under s.15(3)(a) CGST Act, so the post-discount base is both the honest
   * figure and the lower liability. 🛑 This changes what we remit and is a CA
   * question, not a code preference; it is implemented because it was decided,
   * and it is flagged in the plan's standing-risk section for review.
   *
   * Optional, defaulting to 0, so the behaviour is unchanged for any caller
   * that does not pass it — a REQUIRED parameter would have been better at
   * forcing every call site to answer, but three of the four callers compute
   * the discount after the tax today and the reorder is riskier than the
   * default. `audit-checkout-total-parity` is what will catch an omission.
   */
  couponDiscount = 0,
  /**
   * G5 — the group's TAXABLE ancillary charges, in decimal rupees: shipping,
   * COD handling, gift wrap, shipment protection, sale protection.
   *
   * 🛑 These used to enter the order total as BARE ADDENDS carrying no tax at
   * all. Delivery and handling are generally part of a composite supply and
   * taxable at the rate of the principal supply, so a ₹100 shipping line on an
   * 18% order was collected with ~₹15.25 of embedded tax that we declared
   * nowhere.
   *
   * ── THE MECHANISM DIVERGES FROM THE PLAN, DELIBERATELY ──────────────────
   *
   * The plan recorded G5 as "raises buyer totals slightly", i.e. tax ADDED on
   * top of each fee. That is the right reading for a tax-exclusive system and
   * this one is not: `calculateGstInclusive`'s own header states "**Every
   * price in this system is tax-inclusive**", and the product JSON-LD
   * publicly asserts `valueAddedTaxIncluded: true`.
   *
   * So the fees are treated INCLUSIVE, exactly like goods:
   *
   *   · the buyer pays the configured ₹100 — **no total changes, no silent
   *     re-pricing of every order**
   *   · ₹15.25 of it is recognised as GST and remitted
   *   · `taxableAmount` and `gstAmount` rise; the amount collected does not
   *
   * Adding tax on top instead would mix two conventions inside one total —
   * which is the shape of the five-disagreeing-totals problem this phase
   * exists to remove — and would make the published JSON-LD false. Flagged
   * rather than silently chosen; it is still part of the CA conversation.
   *
   * Taxed at the PRINCIPAL rate, derived from the group's own goods (see
   * below), because an ancillary charge follows the supply it is ancillary to.
   */
  taxableFees = 0,
): GroupGstSummary {
  let taxableAmount = 0;
  let exemptAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let gstAmount = 0;
  const byRate = new Map<number, GstRateSlice>();

  /*
   * ── G1: apply the discount to the slice GROSSES before backing tax out ───
   *
   * Collected up front rather than taxed inline, because a discount is a
   * property of the GROUP and has to be spread across its slices before any
   * one of them can be taxed. Three properties matter:
   *
   *   1. **Prorated by gross share**, including exempt slices. A coupon on a
   *      mixed 0%/18% group reduces both proportionally; excluding the exempt
   *      slice would concentrate the whole discount on the taxed one and
   *      under-report the tax.
   *   2. **`allocateAcrossMembers` for the split**, not per-slice
   *      multiplication. It pushes the rounding remainder onto the last slice
   *      so the parts sum to EXACTLY the discounted gross — which is the
   *      invariant that keeps the invoice reconciling against the amount
   *      charged. Independent `× (1 − d/total)` roundings do not.
   *   3. **Clamped at zero.** A discount exceeding the group total (possible
   *      on a free-item promotion) must not produce negative taxable values.
   */
  const rawSlices = items.flatMap((item) => lineTaxComponentsFor(item, productById));
  const grossTotal = rawSlices.reduce((s, sl) => s + sl.taxable, 0);
  const discount = Math.min(Math.max(0, couponDiscount), grossTotal);
  const discountedGross = grossTotal - discount;
  const sliceGross =
    discount > 0 && grossTotal > 0
      ? allocateAcrossMembers(
          discountedGross,
          rawSlices.map((sl) => sl.taxable),
        )
      : rawSlices.map((sl) => sl.taxable);

  for (const [i, raw] of rawSlices.entries()) {
    const slice = { ...raw, taxable: sliceGross[i] ?? raw.taxable };
    {
      /*
       * 🛑 A 0%-rated slice is EXEMPT, not absent. It was `continue`d
       * entirely, so `order.taxableAmount` excluded exempt goods while
       * `items[]` included them — and no mixed exempt/taxed order could ever
       * reconcile its own Taxable column against its own summary. It is
       * accumulated separately instead: representable, without inflating the
       * base the tax was actually charged on.
       */
      if (slice.gstRate <= 0) {
        exemptAmount += slice.taxable;
        continue;
      }
      /*
       * 🛑 `slice.taxable` is the line's GROSS share — prices are
       * tax-INCLUSIVE — so the tax is backed OUT of it, never added on top.
       * `lineTaxComponentsFor`'s documented invariant ("slices of a line sum
       * to its line total") stays true of the gross, which is why the
       * back-out lives here rather than in there.
       *
       * ₹999 @ 5% → taxable ₹951.43 + tax ₹47.57 = ₹999.00 exactly.
       *
       * `calculateGstInclusive`, not `calculateGst(…, taxableFromInclusive(…))`:
       * that composition rounds twice and came to ₹999.01, so the invoice
       * stopped reconciling with the amount charged. Under inclusive pricing
       * the tax is a PARTITION of a fixed amount, not an addition to it.
       */
      const b = calculateGstInclusive(slice.gstRate, intraState, slice.taxable);
      const slabTaxable = b.taxableAmount;
      /*
       * The split comes PER SLICE and is accumulated. `createOrderForGroup`
       * used to re-derive it from the total with `Math.round(gstAmount / 2)` —
       * whole rupees, so ₹161.82 split to 81.00/80.82 instead of 80.91/80.91,
       * and ₹0.52 rounded to 0 and then `|| undefined` dropped the CGST line
       * off the invoice entirely.
       */
      taxableAmount += slabTaxable;
      cgst += b.cgst;
      sgst += b.sgst;
      igst += b.igst;
      gstAmount += b.gstAmount;

      /*
       * Per-rate, because Rule 46 wants taxable value and tax PER RATE on the
       * invoice. A mixed 5%+18% order cannot produce a compliant document from
       * one aggregate triple, and re-deriving it downstream means a second
       * implementation of this loop.
       */
      const prev = byRate.get(slice.gstRate);
      if (prev) {
        prev.taxableAmount = roundRupees(prev.taxableAmount + slabTaxable);
        prev.cgst = roundRupees(prev.cgst + b.cgst);
        prev.sgst = roundRupees(prev.sgst + b.sgst);
        prev.igst = roundRupees(prev.igst + b.igst);
        prev.gstAmount = roundRupees(prev.gstAmount + b.gstAmount);
      } else {
        byRate.set(slice.gstRate, {
          gstRate: slice.gstRate,
          taxableAmount: roundRupees(slabTaxable),
          cgst: b.cgst,
          sgst: b.sgst,
          igst: b.igst,
          gstAmount: b.gstAmount,
        });
      }
    }
  }

  /*
   * ── G5: the ancillary charges, taxed at the PRINCIPAL rate ──────────────
   *
   * A composite supply is taxed at the rate of its principal supply, and the
   * principal supply here is the goods — shipping, handling, gift wrap and the
   * protections exist only because the goods are being supplied.
   *
   * 🛑 "Principal rate" is the rate of the HIGHEST-VALUE taxable component,
   * not the highest rate and not an average. On a mixed 5% + 18% group the
   * principal supply is whichever dominates by value, so a cart of mostly-5%
   * goods carries its shipping at 5%. Taking the highest RATE would
   * over-collect on exactly the carts where the 18% item is a minor add-on;
   * averaging would invent a rate that exists in no schedule and cannot appear
   * on a Rule 46 invoice.
   *
   * 🛑 A group whose goods are entirely EXEMPT (0%) taxes its fees at 0% too —
   * `principalRate` stays null, so the fee lands in `exemptAmount`. Ancillary
   * to an exempt supply is exempt; defaulting to 18% there would tax delivery
   * on a zero-rated order.
   */
  if (taxableFees > 0) {
    let principalRate: number | null = null;
    let principalValue = 0;
    for (const slice of byRate.values()) {
      if (slice.taxableAmount > principalValue) {
        principalValue = slice.taxableAmount;
        principalRate = slice.gstRate;
      }
    }

    if (principalRate === null) {
      // No taxed goods in this group — the fee follows them and is exempt.
      exemptAmount += taxableFees;
    } else {
      // INCLUSIVE, like every other price in this system: the configured fee
      // is what the buyer pays and the tax is backed out of it.
      const f = calculateGstInclusive(principalRate, intraState, taxableFees);
      taxableAmount += f.taxableAmount;
      cgst += f.cgst;
      sgst += f.sgst;
      igst += f.igst;
      gstAmount += f.gstAmount;

      // Folded into the principal rate's existing bucket rather than given its
      // own: on the invoice these are part of one taxable supply at one rate,
      // and a separate line at the same rate would not reconcile against the
      // Rule 46 per-rate summary.
      const prev = byRate.get(principalRate);
      if (prev) {
        prev.taxableAmount = roundRupees(prev.taxableAmount + f.taxableAmount);
        prev.cgst = roundRupees(prev.cgst + f.cgst);
        prev.sgst = roundRupees(prev.sgst + f.sgst);
        prev.igst = roundRupees(prev.igst + f.igst);
        prev.gstAmount = roundRupees(prev.gstAmount + f.gstAmount);
      }
    }
  }

  return {
    taxableAmount: roundRupees(taxableAmount),
    exemptAmount: roundRupees(exemptAmount),
    cgst: roundRupees(cgst),
    sgst: roundRupees(sgst),
    igst: roundRupees(igst),
    gstAmount: roundRupees(gstAmount),
    byRate: [...byRate.values()].sort((x, y) => x.gstRate - y.gstRate),
  };
}

/** One rate's rollup within an order group — what Rule 46 asks an invoice to show. */
export interface GstRateSlice {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
}

/**
 * What one order group owes, with the split and the rate dimension intact.
 *
 * Widened from `{ taxableAmount, gstAmount }` — additive, so both existing
 * callers keep working while neither has to re-derive a split the per-slice
 * `calculateGst` calls above already computed correctly.
 */
export interface GroupGstSummary {
  /** Taxable value of slices carrying a POSITIVE rate. */
  taxableAmount: number;
  /** Taxable value of 0%-rated (exempt) slices. Not part of `taxableAmount`. */
  exemptAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
  byRate: GstRateSlice[];
}

/**
 * Split `total` across members in proportion to their list prices, with the
 * rounding remainder pushed onto the LAST member so the parts sum to exactly
 * `total`, to the last decimal place. Rounding each share independently leaves
 * an order whose `taxableAmount` doesn't reconcile with the sum of its lines.
 *
 * Falls back to an even split when every weight is zero (a bundle of free
 * items), which is the only case where proportion is undefined.
 */
export function allocateAcrossMembers(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  let running = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    const share = sum > 0
      ? roundRupees((total * weights[i]) / sum) // audit-money-units-ok: proportional split of decimal rupees
      : roundRupees(total / weights.length);
    out.push(share);
    running += share;
  }
  out.push(roundRupees(total - running));
  return out;
}

/** Exactly the fields `orderGoodsValue` / `orderTaxableValue` read. */
export interface PayableOrderLike {
  items?: Array<{
    quantity: number;
    unitPrice: number;
    cancelledQuantity?: number;
    /** Snapshotted at purchase. Absent or 0 means no tax to back out. */
    gstRate?: number;
  }>;
  /** The flat shape, authoritative when `items` is absent. */
  quantity?: number;
  unitPrice?: number;
  gstRate?: number;
}

/**
 * The GOODS VALUE of an order — the only correct base for a seller payout.
 *
 * 🛑 This is NOT `OrderDocument.totalPrice`, and conflating the two was a live
 * money bug in all four payout paths (`autoPayoutEligibility`,
 * `weeklyPayoutEligibility`, and both `seller-actions` entry points). That
 * field is the GRAND TOTAL — `checkout/actions.ts` builds it as
 * `goods − coupon + shipping + codHandling + giftWrap +
 * shipmentProtection + platformFee + platformFeeGst + emiSurcharge + gstAmount`
 * — so using it as the payout base did three wrong things at once:
 *
 *  1. **paid the seller the GST we collected** and must remit ourselves;
 *  2. **took the platform fee twice** — the buyer already paid it as a term of
 *     `totalPrice`, and `computePayoutDeduction` then charged the seller a
 *     percentage of a figure that already included it;
 *  3. **computed every percentage on an inflated base**, since shipping, COD
 *     handling, add-on fees and the EMI surcharge were all inside it.
 *
 * The payout base is the **taxable value**, never the gross. That one sentence
 * also covers GST-inclusive pricing: an inclusive ₹999 @5% backs out to a
 * ₹951.43 taxable value and that is what is paid, while an exclusive ₹999
 * charges the buyer ₹1,048.95 and pays ₹999.
 *
 * 🛑 Computed from `quantity − cancelledQuantity`, NOT from `item.totalPrice`.
 * A partial cancellation sets `cancelledQuantity: item.quantity` and
 * **deliberately leaves `totalPrice` untouched** (`order-actions.ts:97-106`),
 * so summing `totalPrice` would pay the seller in full for lines the buyer
 * cancelled. `stock-restore.ts:20` already derives the live quantity this way.
 *
 * 🛑 Falls back to the FLAT `quantity × unitPrice` when `items` is absent.
 * `items?` is optional on `OrderDocument` and the flat fields are the primary
 * shape, not legacy residue — a bare `Σ items[]` would silently pay **zero**
 * on any flat-shaped order, which is indistinguishable from "this seller is
 * owed nothing".
 */
export function orderGoodsValue(order: PayableOrderLike): number {
  const items = order.items;
  if (items?.length) {
    const raw = items.reduce((sum, i) => {
      const live = Math.max(0, i.quantity - (i.cancelledQuantity ?? 0));
      return sum + live * i.unitPrice;
    }, 0);
    return roundRupees(raw);
  }
  return roundRupees((order.quantity ?? 0) * (order.unitPrice ?? 0));
}

/** Sum of `orderGoodsValue` across orders — the GROSS, not the payout base. */
export function ordersGoodsValue(orders: readonly PayableOrderLike[]): number {
  return roundRupees(orders.reduce((sum, o) => sum + orderGoodsValue(o), 0));
}

/**
 * The TAXABLE VALUE of an order — **the payout base.**
 *
 * 🛑 This is the second of two narrowings, and the distinction between them is
 * worth keeping straight:
 *
 *  - C0 established the base is the **goods value**, not the order grand total
 *    (which folded in GST, the platform fee the buyer already paid, shipping,
 *    COD handling, add-ons and the EMI surcharge).
 *  - This establishes it is the **taxable value**, not the gross goods value —
 *    because every price here is tax-INCLUSIVE, so the goods value still has
 *    our GST sitting inside it, and paying that out is the very thing C0 set
 *    out to stop.
 *
 * The second narrowing was not possible until the pricing model was settled:
 * under the old add-on-top math the goods value WAS the taxable value, so the
 * two were indistinguishable and C0's fix was complete as written.
 *
 * One sentence covers both seller modes, which is the reason the flag is an
 * authoring convenience and nothing more:
 *
 *   **the payout base is the taxable value, never the gross.**
 *
 *   - inclusive seller, ₹999 @5% → buyer pays ₹999, taxable ₹951.43, payout ₹951.43
 *   - exclusive seller types ₹999 → grossed up on write to ₹1,048.95, buyer
 *     pays ₹1,048.95, taxable ₹999.00, payout ₹999.00
 *
 * Per ITEM, using each line's own snapshotted `gstRate`: a mixed 5% + 18%
 * order cannot be backed out with a single blended rate, and an order-level
 * rate does not exist.
 */
export function orderTaxableValue(order: PayableOrderLike): number {
  const items = order.items;
  if (items?.length) {
    const raw = items.reduce((sum, i) => {
      const live = Math.max(0, i.quantity - (i.cancelledQuantity ?? 0));
      return sum + taxableFromInclusive(live * i.unitPrice, i.gstRate ?? 0);
    }, 0);
    return roundRupees(raw);
  }
  return taxableFromInclusive(
    (order.quantity ?? 0) * (order.unitPrice ?? 0),
    order.gstRate ?? 0,
  );
}

/** Sum of `orderTaxableValue` across orders — the payout base for a batch. */
export function ordersTaxableValue(orders: readonly PayableOrderLike[]): number {
  return roundRupees(orders.reduce((sum, o) => sum + orderTaxableValue(o), 0));
}

/** The subset `orderShippingReimbursement` reads. */
export interface ReimbursableOrderLike {
  platformBookedShipment?: boolean;
  shippingReimbursement?: { approvedAmount?: number };
  shippingReconciliation?: { reimbursable?: number };
}

/**
 * Postage the seller is owed back on one order — **D45, and it is NOT revenue.**
 *
 * ## Why this is a separate term from the taxable value
 *
 * `orderTaxableValue` above is deliberately goods-only, and that stays true:
 * shipping is not a sale and must never be grossed into the figure GST is
 * backed out of. A reimbursement is a **cost being refunded**, so it is added
 * AFTER the taxable value rather than folded into it — which also means it
 * carries no commission, because commissioning a seller's postage would be
 * charging them for the privilege of posting a parcel.
 *
 * ## 🛑 It reads `approvedAmount`, and absence means NOT YET DECIDED
 *
 * The self-shipped branch pays what an admin approved, never what the seller
 * declared: *"the only approved amount will be given to them."* An absent
 * `approvedAmount` therefore returns 0 — and that is "nothing is payable yet",
 * not "nothing is owed". The distinction matters because a payout batch built
 * before approval must not silently settle the order at zero postage and leave
 * the seller with no later claim; the quiet-period invariant is what holds the
 * order back until the reimbursement is decided.
 *
 * ## 🛑 Shiprocket-booked parcels get NOTHING, gated on the booking
 *
 * We paid that courier. The gate is `platformBookedShipment`, a fact about how
 * the shipment was created — never "does a receipt exist", which a seller
 * supplies and could therefore supply for a parcel they did not pay for.
 *
 * ## The quoted branch pays `reimbursable` from the reconciliation
 *
 * On an order that went through the courier picker, `reconcileOrderShipping`
 * has already computed `min(spent, charged)` at dispatch and stored it. No
 * approval step there: the seller declared a spend against a quote the buyer
 * chose, which is its own evidence, and the cap does the rest.
 *
 * Either way **the platform nets exactly zero on shipping** — the seller is
 * made whole up to what the buyer paid, and any saving goes to the buyer as
 * points.
 */
export function orderShippingReimbursement(order: ReimbursableOrderLike): number {
  if (order.platformBookedShipment === true) return 0;

  /*
   * The self-shipped branch first: an approved amount is an explicit human
   * decision and outranks the dispatch-time computation, which on this branch
   * would not exist anyway.
   */
  const approved = order.shippingReimbursement?.approvedAmount;
  if (typeof approved === "number" && Number.isFinite(approved)) {
    return roundRupees(Math.max(0, approved));
  }

  const reimbursable = order.shippingReconciliation?.reimbursable;
  if (typeof reimbursable === "number" && Number.isFinite(reimbursable)) {
    return roundRupees(Math.max(0, reimbursable));
  }

  /*
   * No reconciliation and no approval. Zero, and deliberately silent: an order
   * dispatched before this feature existed has neither field, and warning on
   * every one of those would make the log useless for the cases that matter.
   */
  return 0;
}

/**
 * Points this order issued, which the STORE funds.
 *
 * ## 🛑 A DEDUCTION, and never a clawback
 *
 * Owner, 2026-10-21: *"so stores bear it"*, framed as *"like a sale discount
 * for getting a repeat customer — you get to pay few loss."* So the earn is a
 * discount expense the seller absorbs, and it comes off their payout.
 *
 * That works as a simple deduction — with no ledger, no clawback and no
 * negative balance — only because of an ordering guarantee worth stating
 * explicitly, since I had it backwards in the plan for a while:
 *
 * ```
 * delivered → completion (points issued) → order-complete closes
 *           → payout-release unblocks → payout computed → payout settled
 * ```
 *
 * `payout-release` is `blockedBy: ["order-complete", …]`, so the payout gate
 * opens BECAUSE the order completed — and completion is the same event that
 * issues the points. The award is therefore **always strictly before** the
 * payout is computed, by construction rather than by timing luck. I had
 * recorded this as "the buyer's fast path RELEASES the payout early, so the
 * absorption may happen after the money has left", which would have required
 * a `sellerLedger` debit against a future payout. The fast path *unblocks*;
 * it does not release. One planned mechanism deleted rather than built.
 *
 * Reads `pointsAwarded` off the order rather than recomputing a percentage:
 * the figure must be what was actually credited, and the goods value may have
 * changed since (a partial cancellation) — recomputing would deduct an amount
 * the buyer never received.
 */
export function orderPointsFunded(order: { pointsAwarded?: number }): number {
  const awarded = order.pointsAwarded;
  return typeof awarded === "number" && Number.isFinite(awarded)
    ? roundRupees(Math.max(0, awarded))
    : 0;
}

/** Sum of `orderPointsFunded` across a batch. */
export function ordersPointsFunded(
  orders: readonly { pointsAwarded?: number }[],
): number {
  return roundRupees(orders.reduce((sum, o) => sum + orderPointsFunded(o), 0));
}

/** Sum of `orderShippingReimbursement` across a batch. */
export function ordersShippingReimbursement(
  orders: readonly ReimbursableOrderLike[],
): number {
  return roundRupees(
    orders.reduce((sum, o) => sum + orderShippingReimbursement(o), 0),
  );
}

/**
 * P-6 — pre-order groups charge each product's own `preOrderDepositPercent`
 * (falling back to the generic COD deposit % when a product doesn't have one
 * configured), summed per line. A single seller group can mix multiple
 * pre-order products with different configured deposit percentages, so this
 * cannot be a single group-level percentage the way the generic COD deposit
 * calculation is.
 */
export function computePreOrderDepositAmount(
  group: Array<{ item: CartItemDocument; product: ProductDocument }>,
  defaultDepositPercent: number,
): number {
  const raw = group.reduce((sum, { item, product }) => {
    const lineTotal = lineTotalFor(item, product);
    const pct = product.preOrderDepositPercent ?? defaultDepositPercent;
    return sum + lineTotal * (pct / 100); // audit-money-units-ok: percentage divisor, not paise
  }, 0);
  return roundRupees(raw);
}
