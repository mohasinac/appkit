"use client";

import React from "react";
import { Gift, MessageCircle, ShieldCheck } from "lucide-react";
import { Div, Row, Stack, Text } from "../../../ui";
import { IconBox } from "../../../ui/components/IconBox";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { formatCurrency } from "../../../utils/number.formatter";

/**
 * Paid add-on checkboxes for ONE store.
 *
 * Add-on fees are billed per order group (= per store), so they are chosen per
 * store: ticking "WhatsApp updates" for one seller must not bill it for every
 * seller in the cart. Rendered inside that store's card in the cart, and inside
 * that store's row of the checkout summary — Buy Now skips the cart entirely,
 * so both surfaces have to be able to edit them.
 */

export interface StoreAddonsValue {
  whatsappNotifyAddon?: boolean;
  giftWrapAddon?: boolean;
  giftWrapMessage?: string;
  shipmentProtectionAddon?: boolean;
}

/** The subset of `siteSettings.commissions` that gates and prices the add-ons. */
export interface StoreAddonsRates {
  whatsappNotifyFeeEnabled?: boolean;
  whatsappNotifyFee?: number;
  giftWrapFeeEnabled?: boolean;
  giftWrapFee?: number;
  shipmentProtectionFeeEnabled?: boolean;
  shipmentProtectionFeePercent?: number;
  shipmentProtectionFeeMin?: number;
}

/**
 * True when the site offers at least one paid add-on.
 *
 * Exported because the picker renders NOTHING when the answer is false, and a
 * parent that doesn't know that ends up drawing a bare "Add-ons" heading over
 * empty space. Callers use this to decide between mounting the picker and
 * showing an explanatory line instead.
 */
export function hasAnyStoreAddon(rates: StoreAddonsRates | null | undefined): boolean {
  return (
    !!rates &&
    !!(
      rates.whatsappNotifyFeeEnabled ||
      rates.giftWrapFeeEnabled ||
      rates.shipmentProtectionFeeEnabled
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
  disabled = false,
  disabledReason,
  showGiftMessage = false,
  currency = "INR",
  className = "",
}: StoreAddonsPickerProps) {
  if (!hasAnyStoreAddon(rates) || !rates) return null;

  const money = (value: number) => formatCurrency(value, currency);
  const set = (patch: StoreAddonsValue) => onChange(storeId, { ...value, ...patch });

  // Mirrors computeShipmentProtectionFee so the label states the real charge.
  const protectionFee = Math.max(
    rates.shipmentProtectionFeeMin ?? 30,
    Math.round(storeSubtotal * ((rates.shipmentProtectionFeePercent ?? 2) / 100) * 100) / 100,
  );

  return (
    <Stack gap="xs" className={`min-w-0 ${className}`}>
      {disabled && disabledReason && (
        <Text size="xs" color="muted">
          {disabledReason}
        </Text>
      )}

      {rates.whatsappNotifyFeeEnabled && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="brand"><MessageCircle size={14} /></IconBox>
          <Div className="flex-1 min-w-0">
            <FieldCheckbox
              name={`whatsappNotifyAddon-${storeId}`}
              label={`WhatsApp order updates (+${money(rates.whatsappNotifyFee ?? 10)})`}
              checked={!!value.whatsappNotifyAddon}
              onChange={(checked) => set({ whatsappNotifyAddon: checked })}
              disabled={disabled}
            />
          </Div>
        </Row>
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

      {rates.shipmentProtectionFeeEnabled && storeSubtotal > 0 && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="brand"><ShieldCheck size={14} /></IconBox>
          <Div className="flex-1 min-w-0">
            <FieldCheckbox
              name={`shipmentProtectionAddon-${storeId}`}
              label={`Shipment protection (+${money(protectionFee)})`}
              checked={!!value.shipmentProtectionAddon}
              onChange={(checked) => set({ shipmentProtectionAddon: checked })}
              disabled={disabled}
            />
          </Div>
        </Row>
      )}
    </Stack>
  );
}
