"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Stack, LoginRequiredModal } from "../../../ui";
import { useToast } from "../../../ui/components/Toast";
import { useAddToCart } from "../../cart/hooks/useAddToCart";
import { apiClient } from "../../../http";
import { addToGuestWishlist } from "../../wishlist/utils/guest-wishlist";
import { ROUTES } from "../../../next";
import { useAuthGate } from "../../../react/hooks/useAuthGate";
import { ACTION_ID } from "../constants/action-defs";

export interface ProductDetailActionsProps {
  productId: string;
  productSlug: string;
  productTitle: string;
  productImage?: string;
  price?: number;
  currency?: string;
  /** Store identifier (storeSlug) — propagated so guest cart lines carry it. */
  storeId?: string;
  /** Denormalised store display name — used by the cart group header. */
  storeName?: string;
  inStock: boolean;
  variant?: "desktop" | "mobile";
}

/**
 * Wires the three primary product-detail CTAs (Buy Now / Add to Cart / Wishlist)
 * to the server APIs with guest-fallback. Replaces the previously-unwired
 * placeholder buttons inside ProductDetailPageView.
 */
export function ProductDetailActions({
  productId,
  productSlug,
  productTitle,
  productImage,
  price,
  storeId,
  storeName,
  inStock,
  variant = "desktop",
}: ProductDetailActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { requireAuth, modalOpen, modalMessage, closeModal } = useAuthGate();
  const [busy, setBusy] = useState<"buy" | "cart" | "wish" | null>(null);
  const [wishlisted, setWishlisted] = useState(false);

  const addCart = useAddToCart({
    onSuccess: () => showToast("Added to cart", "success"),
    onError: (err) =>
      showToast(err?.message ?? "Could not add to cart", "error"),
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

  async function handleBuyNow() {
    requireAuth(ACTION_ID.BUY_NOW, async () => {
      await handleAddToCart(() => router.push(String(ROUTES.USER.CHECKOUT)));
    });
  }

  async function doWishlistAdd() {
    if (wishlisted) return;
    setBusy("wish");
    try {
      try {
        await apiClient.post("/api/wishlist", { productId });
      } catch (err) {
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

  const authModal = (
    <LoginRequiredModal
      isOpen={modalOpen}
      onClose={closeModal}
      message={modalMessage}
    />
  );

  if (variant === "mobile") {
    return (
      <>
        {authModal}
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!inStock || busy !== null}
          onClick={() => handleAddToCart()}
        >
          {busy === "cart" ? "Adding…" : "Add to Cart"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          disabled={!inStock || busy !== null}
          onClick={handleBuyNow}
        >
          {!inStock
            ? "Out of Stock"
            : busy === "buy"
              ? "Loading…"
              : "Buy Now"}
        </Button>
      </>
    );
  }

  return (
    <>
      {authModal}
      <Stack gap="sm">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={!inStock || busy !== null}
          onClick={handleBuyNow}
        >
          {!inStock ? "Out of Stock" : busy === "buy" ? "Loading…" : "Buy Now"}
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          disabled={!inStock || busy !== null}
          onClick={() => handleAddToCart()}
        >
          {!inStock ? "Out of Stock" : busy === "cart" ? "Adding…" : "Add to Cart"}
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="w-full"
          disabled={busy !== null || wishlisted}
          onClick={handleWishlist}
        >
          {wishlisted ? "♥ In Wishlist" : "♡ Add to Wishlist"}
        </Button>
      </Stack>
    </>
  );
}
