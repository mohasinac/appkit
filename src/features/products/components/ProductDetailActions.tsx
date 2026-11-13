"use client";

import { useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Stack } from "../../../ui/components/Layout";
import { LoginRequiredModal } from "../../../ui/components/LoginRequiredModal";
import { Icon } from "../../../ui/components/Icon";
import { useToast } from "../../../ui/components/Toast";
import { useAddToCart } from "../../cart/hooks/useAddToCart";
import { useSingleItemCheckout } from "./useSingleItemCheckout";
import { apiClient } from "../../../http";
import { WISHLIST_ENDPOINTS } from "../../../constants/api-endpoints";
import { addToGuestWishlist } from "../../wishlist/utils/guest-wishlist";
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
  const { showToast } = useToast();
  const { requireAuth, isAuthResolving, modalOpen, modalMessage, closeModal } =
    useAuthGate();
  const { canSeePrices } = useCanSeePrices();
  /*
   * ⚠ `"buy"` IS GONE FROM THIS UNION BECAUSE IT WAS NEVER SET. `setBusy` was
   * only ever called with `"cart"` and `"wish"`, so `busy === "buy"` was dead:
   * pressing Buy Now put "Adding…" on the ADD TO CART button and left the
   * button actually being pressed reading "Buy Now". The buy lane now reports
   * its own progress through `singleItemCheckout.running`, which is the state
   * that genuinely tracks it.
   */
  const [busy, setBusy] = useState<"cart" | "wish" | null>(null);
  const [wishlisted, setWishlisted] = useState(false);

  /*
   * Buy Now and Claim prize are ONE lane — see `useSingleItemCheckout`, which
   * owns the add → narrow-the-selection → checkout sequence and its fail-closed
   * guard. This component keeps the auth gate (the message is per `ACTION_ID`)
   * and nothing else about it.
   */
  const singleItemCheckout = useSingleItemCheckout({
    productId,
    productTitle,
    productImage,
    price,
    storeId,
    storeName,
  });

  // `isAuthResolving` covers the window where the session has not settled and a
  // click would be parked by useAuthGate rather than acted on. Without it the
  // button looks live, swallows the click, and appears to do nothing.
  const blocked = busy !== null || singleItemCheckout.running || isAuthResolving;

  // Success toast (item + updated count/total) is now shown by useAddToCart
  // itself — centralised so every add-to-cart call site gets the same
  // richer toast, not just this one.
  const addCart = useAddToCart({
    onError: (err) =>
      showToast(toUserMessage((err as { code?: string })?.code, undefined, { fallback: "Could not add to cart" }), "error"),
  });

  /*
   * ⚠ The `then?: () => void` continuation is GONE. Its only caller was the old
   * inline Buy Now lane, which chained the selection call onto it; with that
   * lane owned by `useSingleItemCheckout` the parameter had no caller left, and
   * an optional callback nothing passes is the quietest form of the
   * declared-but-unwired class — it reads like an extension point and is dead.
   */
  async function handleAddToCart() {
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
    } finally {
      setBusy(null);
    }
  }

  /**
   * Buy Now — checkout for THIS ITEM ONLY.
   *
   * 🛑 THE LANE ITSELF MOVED TO `useSingleItemCheckout`, and the reasons it is
   * built the way it is are documented there. It moved because "Claim prize" is
   * the same mechanic — one item, straight to checkout — and the owner asked for
   * it in those words: *"event claims go to the checkout like buy now on
   * claims."* Two callers, one implementation, one fail-closed guard.
   *
   * What stays here is the AUTH GATE, deliberately: `requireAuth` resolves its
   * message from `ACTION_ID`, and the claim surface answers to a different
   * action with a different sentence.
   */
  function handleBuyNow() {
    requireAuth(ACTION_ID.BUY_NOW, () => {
      void singleItemCheckout.start();
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
              label: !inStock
                ? "Out of Stock"
                : singleItemCheckout.running
                  ? "Loading…"
                  : "Buy Now",
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
          {!inStock
            ? "Out of Stock"
            : singleItemCheckout.running
              ? "Loading…"
              : "Buy Now"}
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
