/**
 * Pure checkout line-item math shared between the checkout server actions
 * and its test suite. No framework or Firestore imports — safe to unit test
 * directly, unlike `checkout/actions.ts` whose module graph pulls in
 * `server-only` guards that fail outside a real server-action test harness.
 */
import type { CartItemDocument, CartLineKind, CartLineMember } from "../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../features/products/schemas/firestore";
import { roundRupees } from "../../../utils/number.formatter";
import { calculateGst } from "../fees/calculator";

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
 * branch while silently omitting case 1 — so Razorpay captured the LIST price
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
  productById: Map<string, ProductDocument>,
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
  productById: Map<string, ProductDocument>,
  intraState: boolean,
): { taxableAmount: number; gstAmount: number } {
  let taxableAmount = 0;
  let gstAmount = 0;
  for (const item of items) {
    for (const slice of lineTaxComponentsFor(item, productById)) {
      if (slice.gstRate <= 0) continue;
      taxableAmount += slice.taxable;
      gstAmount += calculateGst(slice.gstRate, intraState, slice.taxable).gstAmount;
    }
  }
  return { taxableAmount, gstAmount };
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
