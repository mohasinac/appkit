"use client";

import React from "react";
import { Gift, MessageCircle, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { Div, Row, Stack, Text } from "../../../ui";
import { IconBox } from "../../../ui/components/IconBox";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { formatCurrency } from "../../../utils/number.formatter";

/**
 * Paid add-on checkboxes for ONE store.
 *
 * Add-on fees are billed per order group (= per store), so they are chosen per
 * store: ticking "gift wrap" for one seller must not bill it for every
 * seller in the cart. Rendered inside that store's card in the cart, and inside
 * that store's row of the checkout summary — Buy Now skips the cart entirely,
 * so both surfaces have to be able to edit them.
 */

export interface StoreAddonsValue {
  giftWrapAddon?: boolean;
  giftWrapMessage?: string;
  shipmentProtectionAddon?: boolean;
  saleProtectionAddon?: boolean;
}

/** The subset of `siteSettings.commissions` that gates and prices the add-ons. */
export interface StoreAddonsRates {
  giftWrapFeeEnabled?: boolean;
  giftWrapFee?: number;
  shipmentProtectionFeeEnabled?: boolean;
  shipmentProtectionFeePercent?: number;
  shipmentProtectionFeeMin?: number;
  saleProtectionFeeEnabled?: boolean;
  saleProtectionFeePercent?: number;
  saleProtectionFeeMin?: number;
}

/**
 * Tiers 2 and 3 of the protection gate — C5e. Tier 1 is `rates.*FeeEnabled`.
 *
 * Supplied per store by the caller, which is the only place that knows both
 * the seller's opt-in and what is in this store's basket.
 */
export interface StoreProtectionContext {
  /** `StoreDocument.supportsShippingProtection` — absent reads as NOT supported. */
  supportsShippingProtection?: boolean;
  supportsSaleProtection?: boolean;
  /**
   * True when ANY of this store's selected items is `finalSale`.
   *
   * 🛑 Any, not all, and that is the conservative reading: sale protection is
   * priced on the whole store subtotal and claimed per item, so offering it
   * over a basket containing one non-returnable item would sell cover that
   * cannot be honoured on part of what it was charged for. Shipment protection
   * is deliberately unaffected — a parcel lost in transit was never delivered,
   * so there is nothing for "final" to be final about.
   */
  hasFinalSaleItem?: boolean;
}

/**
 * True when the site offers at least one paid add-on.
 *
 * Exported because the picker renders NOTHING when the answer is false, and a
 * parent that doesn't know that ends up drawing a bare "Add-ons" heading over
 * empty space. Callers use this to decide between mounting the picker and
 * showing an explanatory line instead.
 *
 * 🛑 Deliberately asks only about TIER 1. A seller who supports neither
 * protection still has gift wrap, and a store whose only
 * enabled add-ons are protections it declined must still render the picker —
 * because that is where the risk notice lives, and a hidden notice is the
 * tri-state failure in § `StoreProtectionContext`.
 */
export function hasAnyStoreAddon(rates: StoreAddonsRates | null | undefined): boolean {
  return (
    !!rates &&
    !!(
      rates.giftWrapFeeEnabled ||
      rates.shipmentProtectionFeeEnabled ||
      rates.saleProtectionFeeEnabled
    )
  );
}

export interface StoreAddonsPickerProps {
  storeId: string;
  /** This store's subtotal — shipment protection is a percentage of it. */
  storeSubtotal: number;
  value: StoreAddonsValue;
  onChange: (storeId: string, next: StoreAddonsValue) => void;
  rates: StoreAddonsRates | null;
  /** Tiers 2 and 3. Absent means the seller supports neither protection. */
  protection?: StoreProtectionContext;
  /**
   * When true the controls render disabled with `disabledReason`. Used in the
   * cart when none of this store's items are selected — the fees genuinely
   * aren't being charged, and silently hiding the controls would read as the
   * add-ons having vanished.
   */
  disabled?: boolean;
  disabledReason?: string;
  /** Gift messages don't belong in a collapsed cart sheet — checkout only. */
  showGiftMessage?: boolean;
  currency?: string;
  className?: string;
}

export function StoreAddonsPicker({
  storeId,
  storeSubtotal,
  value,
  onChange,
  rates,
  protection,
  disabled = false,
  disabledReason,
  showGiftMessage = false,
  currency = "INR",
  className = "",
}: StoreAddonsPickerProps) {
  if (!hasAnyStoreAddon(rates) || !rates) return null;

  const money = (value: number) => formatCurrency(value, currency);
  const set = (patch: StoreAddonsValue) => onChange(storeId, { ...value, ...patch });

  // Mirrors computeShipmentProtectionFee / computeSaleProtectionFee so each
  // label states the real charge.
  const feeFor = (minFallback: number, min?: number, percent?: number, pctFallback = 2) =>
    Math.max(
      min ?? minFallback,
      Math.round(storeSubtotal * ((percent ?? pctFallback) / 100) * 100) / 100,
    );
  const protectionFee = feeFor(30, rates.shipmentProtectionFeeMin, rates.shipmentProtectionFeePercent, 2);
  const saleFee = feeFor(49, rates.saleProtectionFeeMin, rates.saleProtectionFeePercent, 3);

  /*
   * All three tiers, evaluated platform → seller → item, exactly as
   * `protectionAvailability` does server-side. The buyer-facing message differs
   * per tier and that is the point: platform-off shows NOTHING (there is
   * nothing to disclose about this seller), seller-off shows the risk notice,
   * item-ineligible says why.
   */
  const shippingOffered = !!rates.shipmentProtectionFeeEnabled && !!protection?.supportsShippingProtection;
  const saleOffered =
    !!rates.saleProtectionFeeEnabled &&
    !!protection?.supportsSaleProtection &&
    !protection?.hasFinalSaleItem;
  const shippingDeclined = !!rates.shipmentProtectionFeeEnabled && !protection?.supportsShippingProtection;
  const saleDeclined = !!rates.saleProtectionFeeEnabled && !protection?.supportsSaleProtection;
  const saleBlockedByFinalSale =
    !!rates.saleProtectionFeeEnabled && !!protection?.supportsSaleProtection && !!protection?.hasFinalSaleItem;

  return (
    <Stack gap="xs" className={`min-w-0 ${className}`}>
      {disabled && disabledReason && (
        <Text size="xs" color="muted">
          {disabledReason}
        </Text>
      )}

      {rates.giftWrapFeeEnabled && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="brand"><Gift size={14} /></IconBox>
          <Stack gap="xs" className="flex-1 min-w-0">
            <FieldCheckbox
              name={`giftWrapAddon-${storeId}`}
              label={`Gift wrap (+${money(rates.giftWrapFee ?? 49)})`}
              checked={!!value.giftWrapAddon}
              onChange={(checked) => set({ giftWrapAddon: checked })}
              disabled={disabled}
            />
            {showGiftMessage && value.giftWrapAddon && (
              <FieldTextarea
                name={`giftWrapMessage-${storeId}`}
                label="Gift message (optional)"
                value={value.giftWrapMessage ?? ""}
                onChange={(next) => set({ giftWrapMessage: next.slice(0, 500) })}
                rows={2}
                maxLength={500}
                showCharCount
                placeholder="Add a note for the recipient…"
                disabled={disabled}
              />
            )}
          </Stack>
        </Row>
      )}

      {shippingOffered && storeSubtotal > 0 && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="brand"><ShieldCheck size={14} /></IconBox>
          <Div className="flex-1 min-w-0">
            <FieldCheckbox
              name={`shipmentProtectionAddon-${storeId}`}
              label={`Shipment protection — loss or damage in transit (+${money(protectionFee)})`}
              checked={!!value.shipmentProtectionAddon}
              onChange={(checked) => set({ shipmentProtectionAddon: checked })}
              disabled={disabled}
            />
          </Div>
        </Row>
      )}

      {saleOffered && storeSubtotal > 0 && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="brand"><ShieldAlert size={14} /></IconBox>
          <Div className="flex-1 min-w-0">
            <FieldCheckbox
              name={`saleProtectionAddon-${storeId}`}
              label={`Sale protection — item not as described (+${money(saleFee)})`}
              checked={!!value.saleProtectionAddon}
              onChange={(checked) => set({ saleProtectionAddon: checked })}
              disabled={disabled}
            />
          </Div>
        </Row>
      )}

      {/*
        🛑 The risk notice, rendered PRE-PURCHASE rather than discovered at
        claim time. A seller who has not opted in must look different from one
        who has — otherwise absence reads as "we did not tell you", which is
        exactly the state this is here to prevent.
      */}
      {(shippingDeclined || saleDeclined) && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="muted"><ShieldOff size={14} /></IconBox>
          <Text size="xs" color="muted" className="flex-1 min-w-0">
            {shippingDeclined && saleDeclined
              ? "This seller does not offer shipment or sale protection."
              : shippingDeclined
                ? "This seller does not offer shipment protection."
                : "This seller does not offer sale protection."}
          </Text>
        </Row>
      )}

      {saleBlockedByFinalSale && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="muted"><ShieldOff size={14} /></IconBox>
          <Text size="xs" color="muted" className="flex-1 min-w-0">
            Sale protection is not available — this basket contains a final-sale
            item. Shipment protection is unaffected.
          </Text>
        </Row>
      )}
    </Stack>
  );
}
