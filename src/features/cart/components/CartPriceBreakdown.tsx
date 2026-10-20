"use client";

import React from "react";
import { Div, Row, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";

/**
 * The aggregate price breakdown shown in the cart's expandable preview and in
 * the checkout Order Summary.
 *
 * Deliberately flat: one line per fee type, with a `× N` qualifier on the fees
 * that accumulate per store. The per-store detail lives on each seller card in
 * the cart, where the store's items and its add-on checkboxes already are —
 * repeating it here would make the panel a second, competing place to read the
 * same numbers.
 *
 * Every figure comes from the server's pricing preview, which prices only the
 * items actually selected for checkout. A deselected item contributes to no
 * line, and a store with nothing selected forms no order group at all, so it
 * contributes no shipping and no add-ons.
 */

/** Mirrors `CheckoutPricingPreviewStore` without importing server code. */
export interface CartPriceBreakdownStore {
  storeId: string;
  storeName: string;
  subtotal: number;
  shippingFee: number;
  codHandlingFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
  saleProtectionFee: number;
  gstAmount: number;
  couponDiscount: number;
  total: number;
  /** C5e tiers 2+3 for this store — see CheckoutPricingPreviewStore. */
  supportsShippingProtection: boolean;
  supportsSaleProtection: boolean;
  hasFinalSaleItem: boolean;
}

/** Mirrors `CheckoutPricingPreview` without importing server code. */
export interface CartPriceBreakdownData {
  subtotal: number;
  shippingFee: number;
  codHandlingFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
  saleProtectionFee: number;
  gstAmount: number;
  couponDiscount: number;
  platformFee: number;
  gstOnFee: number;
  total: number;
  stores: CartPriceBreakdownStore[];
}

export interface CartPriceBreakdownProps {
  preview: CartPriceBreakdownData | null;
  /** Number of items included — shown in the subtotal line so a deselection is visible. */
  itemCount?: number;
  currency?: string;
  /**
   * Shown instead of the fee lines when no server preview is available (a
   * signed-out cart). The subtotal still renders from whatever is known.
   */
  unavailableNote?: React.ReactNode;
  /** Subtotal to show when `preview` is null (guest carts). */
  fallbackSubtotal?: number;
  /**
   * Shown when the preview request FAILED, as opposed to never having run.
   *
   * Separate from `unavailableNote` because the two say different things and
   * the failure case can coexist with a rendered breakdown: on a refetch error
   * the last good `preview` is deliberately kept, so the buyer sees real
   * figures plus a note that they may be out of date — strictly better than
   * blanking to ₹0, which is what a swallowed error used to produce.
   */
  errorNote?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

function Line({
  label,
  amount,
  tone = "muted",
  strong = false,
}: {
  label: string;
  amount: string;
  tone?: "muted" | "success" | "primary";
  strong?: boolean;
}) {
  return (
    <Row align="center" justify="between" gap="sm" className="min-w-0">
      <Text size="sm" color={tone} weight={strong ? "semibold" : undefined} className="min-w-0" truncate={1}>
        {label}
      </Text>
      <Text
        size="sm"
        color={tone}
        weight={strong ? "semibold" : undefined}
        className="flex-shrink-0 tabular-nums"
      >
        {amount}
      </Text>
    </Row>
  );
}

/** "Shipping (2 stores)" — only qualifies when more than one store contributes. */
function withStoreCount(label: string, count: number): string {
  return count > 1 ? `${label} (${count} stores)` : label;
}

export function CartPriceBreakdown({
  preview,
  itemCount,
  currency = "INR",
  unavailableNote,
  fallbackSubtotal = 0,
  errorNote,
  isLoading = false,
  className = "",
}: CartPriceBreakdownProps) {
  const money = (value: number) => formatCurrency(value, currency);

  if (!preview) {
    return (
      <Stack gap="xs" className={className}>
        <Line
          label={itemCount !== undefined ? `Subtotal (${itemCount} item${itemCount !== 1 ? "s" : ""})` : "Subtotal"}
          amount={money(fallbackSubtotal)}
        />
        {/* A failure is the more specific statement, so it wins over the
            generic "not calculated yet" note. */}
        {(errorNote ?? unavailableNote) && (
          <Text size="xs" color={errorNote ? "error" : "muted"}>
            {errorNote ?? unavailableNote}
          </Text>
        )}
      </Stack>
    );
  }

  const storeCount = preview.stores.length;
  // Count how many stores are actually charged each per-store add-on, so the
  // "× N" reads as the real multiplier rather than the store count.
  const countCharged = (pick: (s: CartPriceBreakdownStore) => number) =>
    preview.stores.filter((s) => pick(s) > 0).length;

  const subtotalLabel =
    itemCount !== undefined
      ? `Subtotal (${itemCount} item${itemCount !== 1 ? "s" : ""}${storeCount > 1 ? `, ${storeCount} stores` : ""})`
      : "Subtotal";

  return (
    <Stack gap="xs" className={className}>
      <Line label={subtotalLabel} amount={money(preview.subtotal)} />

      {preview.shippingFee > 0 && (
        <Line label={withStoreCount("Shipping", storeCount)} amount={money(preview.shippingFee)} />
      )}
      {preview.codHandlingFee > 0 && (
        <Line label="COD handling fee" amount={money(preview.codHandlingFee)} />
      )}
      {preview.giftWrapFee > 0 && (
        <Line
          label={withStoreCount("Gift wrap", countCharged((s) => s.giftWrapFee))}
          amount={money(preview.giftWrapFee)}
        />
      )}
      {preview.shipmentProtectionFee > 0 && (
        <Line
          label={withStoreCount("Shipment protection", countCharged((s) => s.shipmentProtectionFee))}
          amount={money(preview.shipmentProtectionFee)}
        />
      )}
      {preview.saleProtectionFee > 0 && (
        <Line
          label={withStoreCount("Sale protection", countCharged((s) => s.saleProtectionFee))}
          amount={money(preview.saleProtectionFee)}
        />
      )}
      {/* One commission on one transaction — never multiplied per store. */}
      {preview.platformFee > 0 && <Line label="Platform fee" amount={money(preview.platformFee)} />}
      {/*
        🛑 `gstOnFee` and `gstAmount` are DIFFERENT TAXES and must never share
        a line. This rendered `gstAmount + gstOnFee` under the single label
        "GST", and every column above it is additive, so the sum read as "the
        GST on this order" — on a ₹20,000 cart it said **₹1.80**.

        `gstOnFee` is GST on our ₹10 commission, genuinely charged on top, and
        it belongs in the additive column. `gstAmount` is the tax already
        INSIDE the item prices (they are tax-inclusive — see
        `taxableFromInclusive`), is excluded from `preview.total` by design,
        and so cannot sit in a column that totals: adding it would make the
        lines overshoot the Total by its own value.

        It is disclosed below the Total instead, which is both honest and what
        a tax-inclusive invoice is supposed to say.
      */}
      {preview.gstOnFee > 0 && (
        <Line label="GST on platform fee" amount={money(preview.gstOnFee)} />
      )}
      {preview.couponDiscount > 0 && (
        <Line label="Coupon discount" amount={`−${money(preview.couponDiscount)}`} tone="success" />
      )}

      <Div border="top-subtle" paddingY="t-sm">
        <Line label="Total" amount={money(preview.total)} tone="primary" strong />
      </Div>

      {/*
        Non-additive by construction: it is rendered AFTER the Total, never as
        a `<Line>` in the list above. Zero whenever product GST reporting is
        off (`siteSettings.gst.enabled` is false until a real GSTIN is
        registered), in which case nothing is claimed at all — which is better
        than naming a tax figure we are not in a position to state.
      */}
      {preview.gstAmount > 0 && (
        <Text size="xs" color="muted">
          Includes GST of {money(preview.gstAmount)}
        </Text>
      )}

      {errorNote ? (
        <Text size="xs" color="error">
          {errorNote}
        </Text>
      ) : (
        isLoading && (
          <Text size="xs" color="muted">
            Updating…
          </Text>
        )
      )}
    </Stack>
  );
}
