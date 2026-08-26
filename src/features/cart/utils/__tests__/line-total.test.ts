/**
 * `clientLineTotal` must agree with the server's `lineTotalFor` on every line
 * shape a client can encounter.
 *
 * The point of these assertions is that the client had NO pricing rule at all
 * before: the checkout page read `(lockedPrice ?? price) * quantity` inline,
 * which is a fourth hand-rolled copy of a rule that has already been got wrong
 * three times (Recurrent Root Cause #75). Each case below is a way that
 * shortcut produced a different number from the one the buyer is charged.
 */
import { describe, it, expect } from "vitest";
import { clientLineTotal } from "../line-total";
import { lineTotalFor } from "../../../../_internal/shared/checkout/order-math";
import type { CartItemDocument } from "../../schemas/firestore";
import type { ProductDocument } from "../../../products/schemas/firestore";

const product = (id: string, price: number) =>
  ({ id, price, gstRate: 18, title: id, status: "published", availableQuantity: 99 } as unknown as ProductDocument);

const line = (over: Partial<CartItemDocument>) =>
  ({
    itemId: "i", productId: "a", price: 0, currency: "INR", quantity: 1,
    storeId: "s", storeName: "S", listingType: "standard", productTitle: "t",
    productImage: "", addedAt: new Date(), updatedAt: new Date(), ...over,
  } as CartItemDocument);

describe("clientLineTotal", () => {
  it("prices a plain line from the cart snapshot", () => {
    expect(clientLineTotal(line({ price: 150, quantity: 3 }))).toBe(450);
  });

  it("honours lockedPrice — an accepted offer or a won auction", () => {
    // The branch the hand-rolled copies kept omitting: the negotiated amount
    // overrides the listing price, which is the entire point of negotiating.
    const offer = line({ price: 199, quantity: 2, lockedPrice: 120, offerId: "o1" });
    expect(clientLineTotal(offer)).toBe(240);
    expect(clientLineTotal(offer)).toBe(lineTotalFor(offer, product("a", 199)));
  });

  it("charges a BUNDLE its own discounted price, not the sum of its members", () => {
    // A bundle line carries groupMembers too, so summing them would silently
    // charge the undiscounted total and throw away the discount.
    const bundle = line({
      lineKind: "bundle",
      bundleCategorySlug: "category-bundle-x",
      price: 400,
      quantity: 2,
      groupMembers: [
        { productId: "a", quantity: 1, unitPrice: 300, title: "a" },
        { productId: "b", quantity: 1, unitPrice: 250, title: "b" },
      ],
    });
    expect(clientLineTotal(bundle)).toBe(800);
  });

  it("charges a legacy bundle (bundleProductIds, no lineKind) the same way", () => {
    const legacy = line({
      bundleCategorySlug: "category-bundle-x",
      bundleProductIds: ["a", "b"],
      price: 400,
      quantity: 1,
    });
    expect(clientLineTotal(legacy)).toBe(400);
  });

  it("sums a GROUP line's members, weighted by each member's own quantity", () => {
    // A group line pins item.quantity to 1, so this is both unit and total.
    const group = line({
      lineKind: "group",
      quantity: 1,
      price: 0,
      groupMembers: [
        { productId: "a", quantity: 2, unitPrice: 199, title: "a" },
        { productId: "c", quantity: 1, unitPrice: 99, title: "c" },
      ],
    });
    expect(clientLineTotal(group)).toBe(497);
  });

  it("matches lineTotalFor whenever the live price equals the snapshot", () => {
    // The one documented divergence is a listing price that moved after the
    // line was added — the server preview overrides the client figure then.
    const plain = line({ productId: "a", price: 199, quantity: 4 });
    expect(clientLineTotal(plain)).toBe(lineTotalFor(plain, product("a", 199)));
  });
});
