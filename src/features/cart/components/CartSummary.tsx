import React from "react";
import { Div, Heading, Stack } from "../../../ui";
export interface CartSummaryProps {
  isLoading?: boolean;
  /** Render the line-items breakdown (subtotal, discount, shipping rows) */
  renderBreakdown?: () => React.ReactNode;
  /** Render the total row */
  renderTotal?: () => React.ReactNode;
  /** Render the checkout CTA button */
  renderCheckoutAction?: () => React.ReactNode;
  /** Render a promo-code input inline in the summary */
  renderPromoCode?: () => React.ReactNode;
  /** Render a "continue shopping" link */
  renderContinueShopping?: () => React.ReactNode;
  labels?: { title?: string };
  className?: string;
}

export function CartSummary({
  renderBreakdown,
  renderTotal,
  renderCheckoutAction,
  renderPromoCode,
  renderContinueShopping,
  labels = {},
  className = "",
}: CartSummaryProps) {
  return (
    <Stack className={`${className}`} gap="md">
      {labels.title && (
        <Heading level={2} variant="none" size="base" weight="bold">
          {labels.title}
        </Heading>
      )}
      {renderBreakdown?.()}
      {renderPromoCode?.()}
      {renderTotal?.()}
      {renderCheckoutAction?.()}
      {renderContinueShopping?.()}
    </Stack>
  );
}
