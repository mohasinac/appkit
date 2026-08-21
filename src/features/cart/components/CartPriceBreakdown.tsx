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
  whatsappNotifyFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
  gstAmount: number;
  couponDiscount: number;
  total: number;
}

/** Mirrors `CheckoutPricingPreview` without importing server code. */
export interface CartPriceBreakdownData {
  subtotal: number;
  shippingFee: number;
  codHandlingFee: number;
  whatsappNotifyFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
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
        {unavailableNote && (
          <Text size="xs" color="muted">
            {unavailableNote}
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
      {preview.whatsappNotifyFee > 0 && (
        <Line
          label={withStoreCount("WhatsApp updates", countCharged((s) => s.whatsappNotifyFee))}
          amount={money(preview.whatsappNotifyFee)}
        />
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
      {/* One commission on one transaction — never multiplied per store. */}
      {preview.platformFee > 0 && <Line label="Platform fee" amount={money(preview.platformFee)} />}
      {(preview.gstAmount > 0 || preview.gstOnFee > 0) && (
        <Line label="GST" amount={money(preview.gstAmount + preview.gstOnFee)} />
      )}
      {preview.couponDiscount > 0 && (
        <Line label="Coupon discount" amount={`−${money(preview.couponDiscount)}`} tone="success" />
      )}

      <Div border="top-subtle" paddingY="t-sm">
        <Line label="Total" amount={money(preview.total)} tone="primary" strong />
      </Div>

      {isLoading && (
        <Text size="xs" color="muted">
          Updating…
        </Text>
      )}
    </Stack>
  );
}
