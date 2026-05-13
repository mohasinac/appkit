"use client";

/**
 * BundleAddToCartCta — S-SBUNI-5 2026-05-13.
 *
 * Client island for the bundle detail page CTA. Replaces the "coming soon"
 * disabled-CTA notice from S-SBUNI-3 + S-SBUNI-4 now that the cart-line
 * foundation + per-member stock decrement at checkout are wired.
 *
 * Receives the bundle slug + an `onAddToCart` callback (typically the
 * `addBundleToCartAction` server action from the consumer app). Renders
 * a qty input + Add button + inline error / toast feedback.
 *
 * Out-of-stock bundles render a disabled button with `ctaOutOfStock` text.
 */

import React, { useState, useCallback } from "react";
import { Button, Input, Row, Stack, Text } from "../../../ui";
import { useToast } from "../../../ui";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";

const MIN_QTY = 1;
const MAX_QTY = 10;

export interface BundleAddToCartCtaProps {
  /** Bundle slug — `categories/{bundle-...}` row. */
  bundleSlug: string;
  /** True when bundleStockStatus === "out_of_stock". Renders disabled CTA. */
  outOfStock?: boolean;
  /**
   * Server-action callback. Returning successfully marks the toast as success;
   * any thrown error surfaces inline + as an error toast. Typed as a generic
   * async fn so consumers can wrap the underlying action however they like.
   */
  onAddToCart: (input: {
    bundleSlug: string;
    quantity: number;
  }) => Promise<unknown>;
}

export function BundleAddToCartCta({
  bundleSlug,
  outOfStock = false,
  onAddToCart,
}: BundleAddToCartCtaProps) {
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(MIN_QTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onAddToCart({ bundleSlug, quantity });
      showToast(BUNDLE_COPY.detail.ctaSuccess, "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : BUNDLE_COPY.detail.ctaErrorFallback;
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [bundleSlug, quantity, onAddToCart, showToast]);

  if (outOfStock) {
    return (
      <Stack gap="xs" aria-live="polite">
        <Button variant="primary" disabled aria-disabled>
          {BUNDLE_COPY.detail.ctaOutOfStock}
        </Button>
        <Text size="xs" color="muted">
          {BUNDLE_COPY.detail.ctaHint}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Row gap="sm" align="center" className="flex-wrap">
        <Stack gap="xs">
          <Text size="xs" color="muted">
            {BUNDLE_COPY.detail.qtyLabel}
          </Text>
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_QTY}
            max={MAX_QTY}
            step={1}
            value={String(quantity)}
            aria-label={BUNDLE_COPY.detail.qtyAriaLabel}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) {
                setQuantity(Math.min(Math.max(MIN_QTY, Math.floor(next)), MAX_QTY));
              }
            }}
            disabled={submitting}
            className="w-20"
          />
        </Stack>
        <Button
          variant="primary"
          onClick={handleClick}
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting
            ? BUNDLE_COPY.detail.ctaAdding
            : BUNDLE_COPY.detail.ctaAddToCart}
        </Button>
      </Row>
      {error && (
        <Text size="sm" color="danger" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
