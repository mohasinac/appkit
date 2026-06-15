"use client";

/**
 * ShippingPicker — buyer-facing shipping provider selector.
 *
 * Renders the store's configured shipping providers as a radio list.
 * The selected provider's id + calculated fee are surfaced via the
 * `onPickProvider` callback so the parent can persist them to the cart item.
 */

import React, { useState } from "react";
import { Button, Div, Row, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { REFUND_COPY } from "../../../_internal/shared/features/orders/refund-copy";
import type { ShippingProviderConfig } from "../../stores/schemas/firestore";

export interface ShippingPickerProps {
  providers: ShippingProviderConfig[];
  /** Currently persisted provider id (from CartItemDocument.chosenShippingProviderId). */
  selectedProviderId?: string;
  /** Order subtotal in paise — used to evaluate freeAboveInPaise + percentOfOrder rules. */
  subtotalInPaise?: number;
  /** Called when the buyer picks (or changes) a provider. */
  onPickProvider: (providerId: string, feeInPaise: number) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
}

/** Resolve the effective flat fee for a provider given the current subtotal. */
function resolveProviderFee(p: ShippingProviderConfig, subtotalInPaise: number): number {
  const { fee } = p;
  if (fee.freeAboveInPaise !== undefined && subtotalInPaise >= fee.freeAboveInPaise) return 0;
  let total = fee.flatInPaise ?? 0;
  if (fee.percentOfOrder !== undefined) {
    total += Math.round((fee.percentOfOrder / 100) * subtotalInPaise);
  }
  if (fee.minInPaise !== undefined) total = Math.max(total, fee.minInPaise);
  return total;
}

export function ShippingPicker({
  providers,
  selectedProviderId,
  subtotalInPaise = 0,
  onPickProvider,
  isLoading = false,
  className = "",
}: ShippingPickerProps) {
  const [pending, setPending] = useState(false);

  if (providers.length === 0) {
    return (
      <Text size="sm" color="muted" className={className}>
        {REFUND_COPY.shipping.noOptions}
      </Text>
    );
  }

  const handleSelect = async (p: ShippingProviderConfig) => {
    const fee = resolveProviderFee(p, subtotalInPaise);
    setPending(true);
    try {
      await onPickProvider(p.providerId, fee);
    } finally {
      setPending(false);
    }
  };

  return (
    <Stack gap="xs" className={className} role="radiogroup" aria-label="Shipping options">
      {providers.map((p) => {
        const fee = resolveProviderFee(p, subtotalInPaise);
        const selected = p.providerId === selectedProviderId;
        const disabled = isLoading || pending;
        return (
          <Button
            key={p.providerId}
            type="button"
            variant={selected ? "primary" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => handleSelect(p)}
            aria-checked={selected}
            role="radio"
            className="w-full justify-start text-left"
          >
            <Row gap="sm" className="w-full" wrap align="center">
              <Div className="flex-1">
                <Text size="sm" weight={selected ? "semibold" : "normal"}>
                  {p.label}
                </Text>
                <Text size="xs" color="muted">
                  {REFUND_COPY.shipping.etaFormat(p.etaDaysMin, p.etaDaysMax)}
                </Text>
              </Div>
              <Text size="sm" weight="semibold">
                {fee === 0 ? REFUND_COPY.shipping.freeLabel : formatCurrency(fee / 100, "INR")}
              </Text>
            </Row>
          </Button>
        );
      })}
    </Stack>
  );
}
