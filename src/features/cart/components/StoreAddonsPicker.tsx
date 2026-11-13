"use client";

import React from "react";
import { Gift, MessageCircle, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Disclaimer } from "../../../ui/components/Disclaimer";
import { resolveAutoCover } from "../../../_internal/shared/features/protection/auto-cover";
import { IconBox } from "../../../ui/components/IconBox";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { formatCurrency } from "../../../utils/number.formatter";
import { addonById } from "../../../_internal/shared/fees/addon-registry";
import {
  addonAvailability,
  type AddonAvailability,
} from "../../../_internal/shared/fees/addon-availability";

/**
 * The picker receives the `commissions.*` keys FLAT; the registry reads them
 * by dotted path from a settings-shaped object.
 *
 * ⚠ A re-nest, not a re-declaration. The field names are unchanged and the
 * registry's `enabledPath` still owns which key gates what — this only
 * restores the shape the path is written against, so the picker and the server
 * read the SAME path rather than two spellings of one flag.
 */
function addonSettingsFromRates(rates: StoreAddonsRates): { commissions: StoreAddonsRates } {
  return { commissions: rates };
}

/**
 * What to show when a descriptor is missing from the registry entirely.
 *
 * 🛑 NOT OFFERED, and specifically `platform-disabled` so it renders NOTHING.
 * An add-on this build cannot describe must not be sold, and must not generate
 * a risk notice about a seller who did nothing wrong.
 */
const NOT_OFFERED: AddonAvailability = { available: false, reason: "platform-disabled" };

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
  saleProtectionAddon?: boolean;
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
 * protection still has WhatsApp updates and gift wrap, and a store whose only
 * enabled add-ons are protections it declined must still render the picker —
 * because that is where the risk notice lives, and a hidden notice is the
 * tri-state failure in § `StoreProtectionContext`.
 */
export function hasAnyStoreAddon(rates: StoreAddonsRates | null | undefined): boolean {
  return (
    !!rates &&
    !!(
      rates.whatsappNotifyFeeEnabled ||
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
  /**
   * `commissions.saleProtectionAutoCoverLimit` — the value covered for free.
   *
   * ⚠ Compared against THIS STORE's subtotal, and that is the right
   * granularity rather than a convenience: each store ships its own parcel, so
   * each parcel carries its own risk. Comparing a cart-wide total would warn
   * about a ₹300 parcel because an unrelated seller's ₹5,000 one shared the
   * checkout.
   *
   * 🛑 Absent reads as 0 — see `resolveAutoCover`. Unknown must WARN here, not
   * promise free cover.
   */
  autoCoverLimit?: number;
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
  autoCoverLimit,
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
   * All three tiers, evaluated platform → seller → item.
   *
   * 🛑 THESE FIVE BOOLEANS USED TO BE HAND-ROLLED HERE, and the comment above
   * them said they matched `protectionAvailability` "exactly" server-side —
   * which is a promise no compiler checks. Two definitions of who is covered
   * is the one thing a protection product cannot have: the picker decides what
   * a buyer is CHARGED for, the server decides what gets PAID OUT, and a
   * divergence means selling cover that will be declined.
   *
   * `addonAvailability` is now the single answer, and it delegates to
   * `protectionAvailability` rather than re-deriving anything.
   *
   * ⚠ The three MESSAGES stay distinct, because that distinction is the point:
   * platform-off shows NOTHING (there is nothing to disclose about this seller
   * or this item), seller-off shows the risk notice, item-ineligible says why.
   */
  const sellerFlags = {
    supportsShippingProtection: protection?.supportsShippingProtection === true,
    supportsSaleProtection: protection?.supportsSaleProtection === true,
  };
  const tierCtx = { settings: addonSettingsFromRates(rates), sellerFlags, finalSale: protection?.hasFinalSaleItem === true };
  const shipDescriptor = addonById("shipmentProtection");
  const saleDescriptor = addonById("saleProtection");
  const shipAvail = shipDescriptor ? addonAvailability(shipDescriptor, tierCtx) : NOT_OFFERED;
  const saleAvail = saleDescriptor ? addonAvailability(saleDescriptor, tierCtx) : NOT_OFFERED;

  const shippingOffered = shipAvail.available;
  const saleOffered = saleAvail.available;
  const shippingDeclined = !shipAvail.available && shipAvail.reason === "seller-not-supported";
  const saleDeclined = !saleAvail.available && saleAvail.reason === "seller-not-supported";

  /*
   * Is THIS store's parcel riding uncovered? Resolved rather than inlined, so
   * the same decision — and the same words — reach the invoice.
   */
  const autoCover = resolveAutoCover({
    orderGoodsValue: storeSubtotal,
    autoCoverLimit,
    protectionPurchased: value.saleProtectionAddon === true,
    sellerOffersProtection: saleAvail.available,
  });
  const saleBlockedByFinalSale = !saleAvail.available && saleAvail.reason === "final-sale";

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

      {/*
        ── THE THRESHOLD DISCLOSURE ─────────────────────────────────────────
        Owner, 2026-11-13: *"if items are already more than a threshold, say
        2k, show the insurance is advised else loss won't be covered by the
        seller or platform."*

        🛑 SEPARATE from the "does not offer" notice above, and louder. That
        one states a seller's capability; this one states what the BUYER is
        carrying right now on this parcel. A buyer who reads "this seller does
        not offer sale protection" has been told a fact about the seller, not
        that their own ₹27,750 order is riding uninsured.

        ⚠ `warning` tone, not `muted`: it is advice to act on before paying,
        and muted is the tone of the things on this panel that need no action.
      */}
      {autoCover.requiresDisclosure && autoCover.message && (
        <Row gap="sm" align="start" className="min-w-0">
          <IconBox size="sm" tone="warning"><ShieldOff size={14} /></IconBox>
          <Text size="xs" color="warning" className="flex-1 min-w-0">
            {autoCover.message}
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

      {/*
        ── 🛑 Phase 12: the protection terms, BESIDE the checkbox ─────────────
        *
        * Rule 1 of the disclaimer registry: visible before the decision it
        * qualifies. The decision here is ticking a box that charges money for
        * cover, so the limits belong on this card — not on `/refund-policy`,
        * which the buyer is not reading at checkout.
        *
        * 🛑 "**not insurance**" is the load-bearing phrase. There is no
        * insurer; this is our own cover, funded by us, and calling it
        * insurance would be a regulatory misstatement as well as a false one.
        *
        * Every limit in the text renders from the constant that ENFORCES it
        * (`SALE_PROTECTION_MAX_VALUE`, the two claim windows) through Phase
        * 9's token mechanism, so a constant change updates the published terms
        * rather than contradicting them.
        *
        * Rendered only when a protection is actually on offer: terms for a
        * product this seller does not sell is the noise that teaches people to
        * skip disclaimers.
      */}
      {(shippingOffered || saleOffered) && <Disclaimer id="protection-cover" inline />}
    </Stack>
  );
}
