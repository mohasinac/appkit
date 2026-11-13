"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../http";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { useAddToCart } from "../../cart/hooks/useAddToCart";
import { useToast } from "../../../ui/components/Toast";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/** Everything a cart line needs to exist, including the guest-cart snapshot. */
export interface SingleItemCheckoutLine {
  productId: string;
  productTitle: string;
  productImage?: string | undefined;
  price?: number | undefined;
  /**
   * Store identifier (storeSlug) and its display name.
   *
   * ⚠ Both optional and both load-bearing for a GUEST: `addToGuestCart` stores
   * a snapshot because a guest has no server cart to read back from, and a line
   * without them renders "SELLER DETAILS UNAVAILABLE" above a real price in
   * `/cart`. A signed-in buyer is unaffected (the server cart carries them as
   * real columns), which is exactly why omitting them survives testing.
   */
  storeId?: string | undefined;
  storeName?: string | undefined;
}

export interface UseSingleItemCheckoutReturn {
  /**
   * Add the line, narrow the cart selection to it, go to checkout.
   *
   * Never rejects: every failure is reported to the buyer and the navigation is
   * withheld. Callers may `void` it.
   */
  start: () => Promise<void>;
  /** True while the lane is in flight — drive the button's label from this. */
  running: boolean;
}

/**
 * THE single-item checkout lane: checkout for THIS ITEM ONLY.
 *
 * 🛑 ONE LANE, TWO CALLERS — and that is the whole reason this is a hook rather
 * than a private function inside `ProductDetailActions`. "Buy Now" and "Claim
 * prize" are the same mechanic (one item, straight to checkout) and the owner
 * said so directly: *"event claims go to the checkout like buy now on claims."*
 * A second implementation would be a second place for the fail-closed guard
 * below to be forgotten, and that guard is the only thing standing between a
 * claim and a checkout priced for the claimant's entire saved cart.
 *
 * 🛑 IT USED TO CHECK OUT THE WHOLE CART. The original body was
 * `handleAddToCart(() => router.push(CHECKOUT))`: it added the item and
 * navigated, and checkout then priced every line the buyer had. Someone with
 * ₹40,000 of saved items who pressed "Buy Now" on a ₹299 spare was taken to a
 * ₹40,299 checkout. Owner, 2026-11-13: *"if i am doing a buy now do not put the
 * whole cart into the checkout, just the item i am buying out."*
 *
 * ✅ Scoped through `selectedItemIds`, the mechanism checkout ALREADY uses
 * (`actions.ts`: `new Set(cart.selectedItemIds)`), rather than inventing a
 * parallel buy-now lane. A stored "buyNowItemId" would be a sixth blocking
 * mechanism and — worse — could go stale and silently scope every LATER
 * checkout to one item. Selection is user-visible in the cart and the buyer can
 * change it, so it cannot strand them.
 *
 * ⚠ The cart KEEPS every other item; only the selection narrows. That is the
 * owner's "cart untouched" — nothing a buyer spent time building is lost.
 *
 * 🛑 FAILS CLOSED. If the scoping call fails we do NOT navigate: landing on
 * checkout with an unnarrowed cart is the exact defect being fixed, and it would
 * charge for items the buyer never chose. An error they can retry is strictly
 * better than a silent overcharge.
 *
 * ⚠ THIS HOOK DOES NOT GATE AUTH. `requireAuth` stays at the call site, because
 * the two callers answer to different `ACTION_ID`s and the gate's message is
 * per-action. A caller that forgets it does not get a security hole — the cart
 * read below 401s for a guest and the lane fails closed — but it does get a
 * worse message than the login modal.
 */
export function useSingleItemCheckout(
  line: SingleItemCheckoutLine,
): UseSingleItemCheckoutReturn {
  const router = useRouter();
  const { showToast } = useToast();
  const [running, setRunning] = useState(false);

  // The success toast (item + updated count/total) is shown by `useAddToCart`
  // itself — centralised so every add-to-cart call site gets the same richer
  // toast. Only the failure message is ours.
  const addCart = useAddToCart({
    onError: (err) =>
      showToast(
        toUserMessage((err as { code?: string })?.code, undefined, {
          fallback: "Could not add to cart",
        }),
        "error",
      ),
  });

  const { productId, productTitle, productImage, price, storeId, storeName } =
    line;

  async function start(): Promise<void> {
    if (running) return;
    setRunning(true);
    try {
      try {
        await addCart.mutate({
          productId,
          quantity: 1,
          productTitle,
          productImage,
          price,
          storeId,
          storeName,
        });
      } catch (err) {
        /*
         * `useAddToCart`'s own `onError` has already shown the message, so all
         * that is owed here is NOT to navigate. Previously this rejection
         * escaped into `requireAuth`'s fire-and-forget callback as an unhandled
         * promise rejection and the buyer was navigated nowhere with no
         * explanation of why.
         */
        void normalizeError(err);
        return;
      }

      try {
        const res = (await apiClient.get(CART_ENDPOINTS.GET)) as
          | { cart?: { items?: Array<{ itemId: string; productId: string }> } }
          | undefined;
        const cartLine = res?.cart?.items?.find(
          (i) => i.productId === productId,
        );
        if (!cartLine) throw new Error("cart line not found after add");
        await apiClient.put(CART_ENDPOINTS.SELECTION, {
          itemIds: [cartLine.itemId],
        });
      } catch (err) {
        void normalizeError(err);
        showToast(
          "Could not start a single-item checkout. Open your cart and try again.",
          "error",
        );
        return;
      }

      router.push(String(ROUTES.USER.CHECKOUT));
    } finally {
      setRunning(false);
    }
  }

  return { start, running };
}
