"use client";

/**
 * BundleBuyNowCta — purchase CTAs for bundle detail pages.
 *
 * A bundle is ALL-OR-NOTHING: its members are not pickable, and the only
 * quantity the buyer controls is how many COPIES of the whole bundle they want.
 * That is why there is one stepper here and no per-member controls anywhere on
 * the bundle page — the mirror image of `GroupMemberPicker`, which has
 * per-member steppers and no line-level one.
 *
 * Two CTAs, not one. "Buy now" adds and jumps straight to checkout (the
 * pre-existing express path). "Add to cart" adds and stays — without it a
 * bundle could never sit in the cart to be edited, because the only route in
 * pushed the buyer past the cart immediately.
 */

import React, { useState, useCallback } from "react";
import { Button, LoginRequiredModal, Row, Stack, Text } from "../../../ui";
import { QuantityStepper } from "../../../ui/components/QuantityStepper";
import { useToast } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";
import { normalizeError } from "../../../errors/normalize";

export interface BundleBuyNowCtaProps {
  bundleSlug: string;
  outOfStock?: boolean;
  onBuyNow: (input: { bundleSlug: string; quantity: number }) => Promise<unknown>;
  /** Adds without leaving the page. Omit to render Buy-now only. */
  onAddToCart?: (input: { bundleSlug: string; quantity: number }) => Promise<unknown>;
  /** Renders a smaller single-line button suited for list cards. */
  compact?: boolean;
}

export function BundleBuyNowCta({
  bundleSlug,
  outOfStock = false,
  onBuyNow,
  onAddToCart,
  compact = false,
}: BundleBuyNowCtaProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const run = useCallback(
    async (fn: (input: { bundleSlug: string; quantity: number }) => Promise<unknown>, successMsg?: string) => {
      setError(null);
      setSubmitting(true);
      try {
        await fn({ bundleSlug, quantity });
        if (successMsg) showToast(successMsg, "success");
      } catch (err) {
        void normalizeError(err);
        if (isAuthError(err)) {
          setShowLoginModal(true);
        } else {
          const message = err instanceof Error ? err.message : BUNDLE_COPY.detail.ctaErrorFallback;
          setError(message);
          showToast(message, "error");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [bundleSlug, quantity, showToast],
  );

  const handleClick = useCallback(() => run(onBuyNow), [run, onBuyNow]);
  const handleAddToCart = useCallback(
    () => (onAddToCart ? run(onAddToCart, "Bundle added to your cart.") : Promise.resolve()),
    [run, onAddToCart],
  );

  if (outOfStock) {
    return (
      <Stack gap="xs" aria-live="polite">
        <Button variant="primary" size={compact ? "sm" : "md"} disabled aria-disabled className={compact ? "w-full" : undefined}>
          {BUNDLE_COPY.detail.ctaOutOfStock}
        </Button>
        {!compact && (
          <Text size="xs" color="muted">{BUNDLE_COPY.detail.ctaHint}</Text>
        )}
      </Stack>
    );
  }

  return (
    <>
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to purchase this bundle. Please log in or create an account to continue."
      />
      <Stack gap="sm">
        {/* Copies of the WHOLE bundle. A bundle has no per-member controls by
            design — that is what "all or nothing" means. */}
        {!compact && (
          <Row gap="sm" align="center">
            <Text size="sm" color="muted">Copies</Text>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={99}
              disabled={submitting}
              size="md"
              ariaLabel="Number of copies of this bundle"
              decrementLabel={ACTIONS.CART["decrease-quantity"].ariaLabel}
              incrementLabel={ACTIONS.CART["increase-quantity"].ariaLabel}
            />
          </Row>
        )}
        <Row gap="sm" wrap className={compact ? "w-full" : undefined}>
          <Button
            variant="primary"
            size={compact ? "sm" : "md"}
            onClick={handleClick}
            disabled={submitting}
            aria-busy={submitting}
            className={compact ? "w-full" : undefined}
          >
            {submitting ? BUNDLE_COPY.detail.ctaAdding : BUNDLE_COPY.detail.ctaBuyNow}
          </Button>
          {onAddToCart && !compact && (
            <Button
              action={ACTIONS.CART["add-bundle-to-cart"]}
              variant="outline"
              size="md"
              onClick={handleAddToCart}
              disabled={submitting}
              aria-busy={submitting}
            />
          )}
        </Row>
        {error && (
          <Text size="sm" color="danger" role="alert">{error}</Text>
        )}
      </Stack>
    </>
  );
}
