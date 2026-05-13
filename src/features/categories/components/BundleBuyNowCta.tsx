"use client";

/**
 * BundleBuyNowCta — direct-checkout CTA for bundle detail pages.
 *
 * Replaces BundleAddToCartCta (deleted). Bundles bypass the cart and go
 * straight to checkout via the `directBundleCheckoutAction` server action.
 * No qty input — bundles are always qty=1 per checkout.
 */

import React, { useState, useCallback } from "react";
import { Button, Stack, Text } from "../../../ui";
import { useToast } from "../../../ui";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";

export interface BundleBuyNowCtaProps {
  bundleSlug: string;
  outOfStock?: boolean;
  onBuyNow: (input: { bundleSlug: string }) => Promise<unknown>;
}

export function BundleBuyNowCta({
  bundleSlug,
  outOfStock = false,
  onBuyNow,
}: BundleBuyNowCtaProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onBuyNow({ bundleSlug });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : BUNDLE_COPY.detail.ctaErrorFallback;
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [bundleSlug, onBuyNow, showToast]);

  if (outOfStock) {
    return (
      <Stack gap="xs" aria-live="polite">
        <Button variant="primary" disabled aria-disabled>
          {BUNDLE_COPY.detail.ctaOutOfStock}
        </Button>
        <Text size="xs" color="muted">{BUNDLE_COPY.detail.ctaHint}</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Button
        variant="primary"
        onClick={handleClick}
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? BUNDLE_COPY.detail.ctaAdding : BUNDLE_COPY.detail.ctaBuyNow}
      </Button>
      {error && (
        <Text size="sm" color="danger" role="alert">{error}</Text>
      )}
    </Stack>
  );
}
