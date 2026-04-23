import React from "react";
import { Heading } from "../../../ui";

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
    <div className={`space-y-4 ${className}`} data-section="cartsummary-div-260">
      {labels.title && (
        <Heading level={2} className="text-base font-bold" variant="none">
          {labels.title}
        </Heading>
      )}
      {renderBreakdown?.()}
      {renderPromoCode?.()}
      {renderTotal?.()}
      {renderCheckoutAction?.()}
      {renderContinueShopping?.()}
    </div>
  );
}
