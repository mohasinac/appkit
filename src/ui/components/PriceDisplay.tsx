"use client";

import { GatedPrice } from "./GatedPrice";

export interface PriceDisplayProps {
  amount: number;
  currency?: string;
  originalAmount?: number;
  variant?: "compact" | "detail";
  className?: string;
}

/**
 * A product price on a public surface — gated behind sign-in.
 *
 * This is now a thin wrapper over `<GatedPrice>`, with no opt-out, because both
 * of its consumers (`ProductGrid`'s card + list rows, and the generic
 * `ProductDetailPageView`) are public listing surfaces. There is deliberately no
 * `ungated` prop: nothing in admin, seller, cart, checkout or orders uses this
 * component, so an escape hatch here would exist only to be misused. Those
 * surfaces call `formatCurrency` directly and are signed-in by definition.
 *
 * Rendering, discount badge and markup are unchanged for a signed-in viewer.
 */
export function PriceDisplay({
  amount,
  currency,
  originalAmount,
  variant = "compact",
  className,
}: PriceDisplayProps) {
  return (
    <GatedPrice
      amount={amount}
      currency={currency}
      originalAmount={originalAmount}
      variant={variant}
      className={className}
    />
  );
}
