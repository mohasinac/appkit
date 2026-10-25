"use client";

import React from "react";
import { Details, Summary } from "../../../ui/components/Details";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { formatCurrency } from "../../../utils/number.formatter";
import type { FeeDerivation, FeeDerivations } from "../../../_internal/shared/fees/explain";

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
  saleProtectionFee: number;
  emiSurcharge: number;
  gstAmount: number;
  couponDiscount: number;
  total: number;
  /** C5e tiers 2+3 for this store — see CheckoutPricingPreviewStore. */
  supportsShippingProtection: boolean;
  supportsSaleProtection: boolean;
  hasFinalSaleItem: boolean;
  /** D46/D47 + decision 22 — whether this seller accepts points, and how many. */
  acceptsPoints: boolean;
  pointsApplied: number;
  /** S5a — handling + extra shipping legs for this store's order. */
  sharedPurchaseFee: number;
}

/** Mirrors `CheckoutPricingPreview` without importing server code. */
export interface CartPriceBreakdownData {
  subtotal: number;
  shippingFee: number;
  codHandlingFee: number;
  whatsappNotifyFee: number;
  giftWrapFee: number;
  shipmentProtectionFee: number;
  saleProtectionFee: number;
  emiSurcharge: number;
  gstAmount: number;
  couponDiscount: number;
  platformFee: number;
  gstOnFee: number;
  /** S5a — handling + extra shipping legs across the cart. */
  sharedPurchaseFee: number;
  total: number;
  /** D46/D47 — points applied across every accepting store. */
  pointsApplied: number;
  /** What the buyer actually pays: `total − pointsApplied`. */
  amountDue: number;
  /** Their remaining balance, for the toggle's own label. */
  pointsBalance: number;
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
  /**
   * Per-line "why am I paying this" disclosures, built by the
   * `explain*` helpers in `_internal/shared/fees/explain`.
   *
   * 🛑 Optional, and an absent entry renders no disclosure rather than a
   * placeholder. The cart renders this breakdown for a signed-out guest with
   * no server preview at all — a line that cannot be explained must say
   * nothing, never "we could not work this out", which reads as a fault.
   */
  derivations?: FeeDerivations;
}

/**
 * The "how is this calculated?" disclosure under a fee line.
 *
 * 🛑 Collapsed by default, and that is the whole design. An unexplained charge
 * is untrustworthy, but five expanded derivations turn the Order Summary into
 * a wall of arithmetic at the moment a buyer is deciding to pay. The
 * obligation is that the answer is *available at the point of the charge* —
 * not that it is shouted.
 *
 * A native `<details>` rather than a tooltip or a modal: it works before
 * hydration, it is keyboard-reachable for free, and it does not cover the
 * number it is explaining.
 */
function Derivation({ derivation }: { derivation: FeeDerivation }) {
  return (
    <Details tone="muted" padding="sm" rounded="md">
      <Summary size="xs" color="muted">
        How is this calculated?
      </Summary>
      <Stack gap="xs" className="pt-[var(--appkit-space-2)]">
        <Text size="xs" color="muted">
          {derivation.summary}
        </Text>
        {derivation.steps.map((step, i) => (
          <Text key={i} size="xs" color="faint" className="tabular-nums">
            {step}
          </Text>
        ))}
      </Stack>
    </Details>
  );
}

function Line({
  label,
  amount,
  tone = "muted",
  strong = false,
  derivation,
}: {
  label: string;
  amount: string;
  tone?: "muted" | "success" | "primary";
  strong?: boolean;
  /** When present, the line carries a collapsed derivation beneath it. */
  derivation?: FeeDerivation | null;
}) {
  const row = (
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

  if (!derivation) return row;
  return (
    <Stack gap="xs">
      {row}
      <Derivation derivation={derivation} />
    </Stack>
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
  derivations,
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
        <Line
          label="COD handling fee"
          amount={money(preview.codHandlingFee)}
          derivation={derivations?.codHandlingFee}
        />
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
      {preview.saleProtectionFee > 0 && (
        <Line
          label={withStoreCount("Sale protection", countCharged((s) => s.saleProtectionFee))}
          amount={money(preview.saleProtectionFee)}
        />
      )}
      {/*
        Additive, and named for what it is. The surcharge is the cost of
        choosing EMI over paying in full — it belongs in the column, unlike the
        tax-inclusive item GST below the Total.
      */}
      {preview.emiSurcharge > 0 && (
        <Line
          label="EMI surcharge"
          amount={money(preview.emiSurcharge)}
          derivation={derivations?.emiSurcharge}
        />
      )}
      {/*
        S5a — named for what the buyer asked for, not for the mechanism.
        "Split delivery" is what they chose; "shared-purchase handling fee plus
        N−1 extra shipping legs" is how we price it, and a fee line that
        describes our pricing model rather than their decision is one they
        cannot check.
      */}
      {preview.sharedPurchaseFee > 0 && (
        <Line
          label={withStoreCount(
            "Split delivery",
            countCharged((s) => s.sharedPurchaseFee),
          )}
          amount={money(preview.sharedPurchaseFee)}
        />
      )}
      {/* One commission on one transaction — never multiplied per store. */}
      {preview.platformFee > 0 && (
        <Line
          label="Platform fee"
          amount={money(preview.platformFee)}
          derivation={derivations?.platformFee}
        />
      )}
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
        <Line
          label="GST on platform fee"
          amount={money(preview.gstOnFee)}
          derivation={derivations?.gstOnFee}
        />
      )}
      {preview.couponDiscount > 0 && (
        <Line label="Coupon discount" amount={`−${money(preview.couponDiscount)}`} tone="success" />
      )}

      <Div border="top-subtle" paddingY="t-sm">
        <Line
          label="Total"
          amount={money(preview.total)}
          tone="primary"
          strong={preview.pointsApplied <= 0}
        />
      </Div>

      {/*
        ── D46/D47 — the points tender, as TWO lines plus an amount due ────────

        🛑 Three figures, never one. Collapsing them hides the discount from the
        person who earned it: a buyer who ticked "pay with points" and sees only
        a smaller number cannot tell whether their points were applied, how many
        went in, or why the figure is not smaller still. `total` stays the order
        value (it is what the invoice declares and what a refund measures
        against), the discount is named, and `amountDue` is what the card will
        be charged.

        🛑 The emphasis MOVES to Amount due when points apply — `strong` above
        is conditional for that reason. Two bold totals is worse than one, and
        the one that matters is the figure being collected.

        Points are named in points, not rupees, even though 1 point = ₹1: the
        schema's opening line is that this is NOT a wallet, and that distinction
        is legal rather than stylistic. Rendering "₹250" where the buyer spent
        250 points is the framing the whole feature is written to avoid.
      */}
      {preview.pointsApplied > 0 && (
        <>
          <Line
            label={`Points applied (${preview.pointsApplied.toLocaleString("en-IN")} pts)`}
            amount={`−${money(preview.pointsApplied)}`}
            tone="success"
          />
          <Div border="top-subtle" paddingY="t-sm">
            <Line label="Amount due" amount={money(preview.amountDue)} tone="primary" strong />
          </Div>
        </>
      )}

      {/*
        The cap is a real constraint a buyer will hit, so it is explained where
        they hit it rather than in a FAQ. Shown only when the cap actually bit —
        i.e. they still have points left over — so an unconstrained redemption
        says nothing.
      */}
      {preview.pointsApplied > 0 && preview.pointsBalance > preview.pointsApplied && (
        <Text size="xs" color="muted">
          {(preview.pointsBalance - preview.pointsApplied).toLocaleString("en-IN")} points stay in
          your balance — up to half of an order can be paid with points.
        </Text>
      )}

      {/*
        🛑 The silent case, and the reason it needs its own branch: the buyer
        opted in and NOTHING was applied. With no note here the toggle appears
        to do nothing at all, which reads as a broken control — the exact
        failure mode of the dismissible chrome in Root Cause #41 and of the
        ~39 search boxes whose endpoints never read `q`.

        `pointsBalance` is only read when the buyer opted in, so a non-zero
        balance with nothing applied IS that state — no extra prop needed.
       */}
      {preview.pointsApplied === 0 && preview.pointsBalance > 0 && (
        <Text size="xs" color="muted">
          {preview.stores.some((s) => s.acceptsPoints)
            ? "Your points could not be applied to this order."
            : storeCount > 1
              ? "None of these sellers accepts points."
              : "This seller does not accept points."}
        </Text>
      )}

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
