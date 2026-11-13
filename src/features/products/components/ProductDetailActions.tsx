"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../ui/components/Button";
import { Stack } from "../../../ui/components/Layout";
import { LoginRequiredModal } from "../../../ui/components/LoginRequiredModal";
import { Icon } from "../../../ui/components/Icon";
import { useToast } from "../../../ui/components/Toast";
import { useAddToCart } from "../../cart/hooks/useAddToCart";
import { apiClient } from "../../../http";
import { CART_ENDPOINTS, WISHLIST_ENDPOINTS } from "../../../constants/api-endpoints";
import { addToGuestWishlist } from "../../wishlist/utils/guest-wishlist";
import { ROUTES } from "../../../next/routing/route-map";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../constants/action-defs";
import { useBottomActions } from "../../../ui/chrome/useBottomActions";
import { formatCurrency } from "../../../utils/number.formatter";
import { useCanSeePrices } from "../../../react/hooks/useCanSeePrices";

import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
export interface ProductDetailActionsProps {
  productId: string;
  productTitle: string;
  productImage?: string;
  price?: number;
  currency?: string;
  /** Store identifier (storeSlug) — propagated so guest cart lines carry it. */
  storeId?: string;
  /** Denormalised store display name — used by the cart group header. */
  storeName?: string;
  inStock: boolean;
  /**
   * "desktop" renders inline buttons. "mobile" registers actions via
   * useBottomActions() for the layout-level BottomActions bar and renders
   * nothing inline (only the auth modal).
   */
  variant?: "desktop" | "mobile";
}

/**
 * Wires the three primary product-detail CTAs (Buy Now / Add to Cart / Wishlist)
 * to the server APIs with guest-fallback. Replaces the previously-unwired
 * placeholder buttons inside ProductDetailPageView.
 */
export function ProductDetailActions({
  productId,
  productTitle,
  productImage,
  price,
  currency,
  storeId,
  storeName,
  inStock,
  variant = "desktop",
}: ProductDetailActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { requireAuth, isAuthResolving, modalOpen, modalMessage, closeModal } =
    useAuthGate();
  const { canSeePrices } = useCanSeePrices();
  const [busy, setBusy] = useState<"buy" | "cart" | "wish" | null>(null);
  const [wishlisted, setWishlisted] = useState(false);

  // `isAuthResolving` covers the window where the session has not settled and a
  // click would be parked by useAuthGate rather than acted on. Without it the
  // button looks live, swallows the click, and appears to do nothing.
  const blocked = busy !== null || isAuthResolving;

  // Success toast (item + updated count/total) is now shown by useAddToCart
  // itself — centralised so every add-to-cart call site gets the same
  // richer toast, not just this one.
  const addCart = useAddToCart({
    onError: (err) =>
      showToast(toUserMessage((err as { code?: string })?.code, undefined, { fallback: "Could not add to cart" }), "error"),
  });

  async function handleAddToCart(then?: () => void) {
    setBusy("cart");
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
      then?.();
    } finally {
      setBusy(null);
    }
  }

  /**
   * Buy Now — checkout for THIS ITEM ONLY.
   *
   * 🛑 IT USED TO CHECK OUT THE WHOLE CART. The old body was
   * `handleAddToCart(() => router.push(CHECKOUT))`: it added the item and
   * navigated, and checkout then priced every line the buyer had. Someone with
   * ₹40,000 of saved items who pressed "Buy Now" on a ₹299 spare was taken to
   * a ₹40,299 checkout. Owner, 2026-11-13: *"if i am doing a buy now do not
   * put the whole cart into the checkout, just the item i am buying out."*
   *
   * ✅ Scoped through `selectedItemIds`, the mechanism checkout ALREADY uses
   * (`actions.ts`: `new Set(cart.selectedItemIds)`), rather than inventing a
   * parallel buy-now lane. A stored "buyNowItemId" would be a sixth blocking
   * mechanism and — worse — could go stale and silently scope every LATER
   * checkout to one item. Selection is user-visible in the cart and the buyer
   * can change it, so it cannot strand them.
   *
   * ⚠ The cart KEEPS every other item; only the selection narrows. That is the
   * owner's "cart untouched" — nothing a buyer spent time building is lost.
   *
   * 🛑 FAILS CLOSED. If the scoping call fails we do NOT navigate: landing on
   * checkout with an unnarrowed cart is the exact defect being fixed, and it
   * would charge for items the buyer never chose. An error they can retry is
   * strictly better than a silent overcharge.
   */
  async function handleBuyNow() {
    requireAuth(ACTION_ID.BUY_NOW, async () => {
      await handleAddToCart(async () => {
        try {
          const res = (await apiClient.get(CART_ENDPOINTS.GET)) as
            | { cart?: { items?: Array<{ itemId: string; productId: string }> } }
            | undefined;
          const line = res?.cart?.items?.find((i) => i.productId === productId);
          if (!line) throw new Error("cart line not found after add");
          await apiClient.put(CART_ENDPOINTS.SELECTION, { itemIds: [line.itemId] });
        } catch (err) {
          void normalizeError(err);
          showToast(
            "Could not start a single-item checkout. Open your cart and try again.",
            "error",
          );
          return;
        }
        router.push(String(ROUTES.USER.CHECKOUT));
      });
    });
  }

  async function doWishlistAdd() {
    if (wishlisted) return;
    setBusy("wish");
    try {
      try {
        await apiClient.post(WISHLIST_ENDPOINTS.ADD, { productId });
      } catch (err: unknown) {
        void normalizeError(err);
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          addToGuestWishlist(productId, "product", {
            title: productTitle,
            image: productImage,
          });
        } else {
          throw err;
        }
      }
      setWishlisted(true);
      showToast("Saved to wishlist", "success");
    } catch (err) {
      void normalizeError(err);
      const msg = (err as Error)?.message ?? "Could not save to wishlist";
      showToast(msg, "error");
    } finally {
      setBusy(null);
    }
  }

  function handleWishlist() {
    requireAuth(ACTION_ID.ADD_TO_WISHLIST, () => {
      void doWishlistAdd();
    });
  }

  // Mobile: register actions with layout-level BottomActions bar
  useBottomActions(
    variant === "mobile"
      ? {
          actions: [
            {
              id: ACTION_ID.ADD_TO_WISHLIST,
              label: wishlisted ? "Saved" : "Wishlist",
              variant: "ghost",
              disabled: blocked || wishlisted,
              onClick: handleWishlist,
            },
            {
              id: ACTION_ID.ADD_TO_CART,
              label: busy === "cart" ? "Adding…" : "Add to Cart",
              variant: "outline",
              disabled: !inStock || blocked,
              onClick: () => handleAddToCart(),
            },
            {
              id: ACTION_ID.BUY_NOW,
              label: !inStock ? "Out of Stock" : busy === "buy" ? "Loading…" : "Buy Now",
              variant: "primary",
              disabled: !inStock || blocked,
              onClick: handleBuyNow,
            },
          ],
          // A plain string on the bottom bar, so the gate happens as it is
          // built rather than in a slot. It also doubles as the bar's
          // re-publish key, and the two branches never produce equal text.
          infoLabel:
            price == null || !currency
              ? undefined
              : canSeePrices
                ? formatCurrency(price, currency)
                : "Sign in to see price",
          // The bar itself owns responsive visibility now, so this one registrar serves
          // both breakpoints. The desktop branch below must NOT also register —
          // useBottomActions is last-mounted-wins and the two would clobber each other.
          desktop: "after-scroll" as const,
        }
      : {},
  );

  const authModal = (
    <LoginRequiredModal
      isOpen={modalOpen}
      onClose={closeModal}
      message={modalMessage}
    />
  );

  if (variant === "mobile") {
    return <>{authModal}</>;
  }

  return (
    <>
      {authModal}
      {/* The CTA anchor that gates `SideActionDock` is marked one level up, on
          `ProductDetailPageView`'s buy panel — this component renders NOTHING
          in its `variant="mobile"` form, and an anchor missing on a phone would
          hold the dock shut on the surface that needs it most. */}
      <Stack gap="sm">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={!inStock || blocked}
          onClick={handleBuyNow}
        >
          {!inStock ? "Out of Stock" : busy === "buy" ? "Loading…" : "Buy Now"}
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          disabled={!inStock || blocked}
          onClick={() => handleAddToCart()}
        >
          {!inStock ? "Out of Stock" : busy === "cart" ? "Adding…" : "Add to Cart"}
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="w-full"
          disabled={blocked || wishlisted}
          onClick={handleWishlist}
        >
          <Icon name="wishlist" size="md" filled={wishlisted} />
          {wishlisted ? "In Wishlist" : "Add to Wishlist"}
        </Button>
      </Stack>
    </>
  );
}
