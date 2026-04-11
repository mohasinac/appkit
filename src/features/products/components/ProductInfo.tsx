import React from "react";

export interface ProductInfoProps {
  isLoading?: boolean;
  /** Title, condition badge, brand */
  renderTitle?: (isLoading: boolean) => React.ReactNode;
  /** Price + original price + discount badge */
  renderPrice?: (isLoading: boolean) => React.ReactNode;
  /** Feature / promo badges row */
  renderBadges?: () => React.ReactNode;
  /** Short description / highlights */
  renderDescription?: () => React.ReactNode;
  /** Variant selectors (size, colour, etc.) */
  renderVariants?: () => React.ReactNode;
  /** Seller info row */
  renderSeller?: () => React.ReactNode;
  /** Rating / review summary row */
  renderRating?: () => React.ReactNode;
  className?: string;
}

export function ProductInfo({
  isLoading = false,
  renderTitle,
  renderPrice,
  renderBadges,
  renderDescription,
  renderVariants,
  renderSeller,
  renderRating,
  className = "",
}: ProductInfoProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {renderTitle?.(isLoading)}
      {renderRating?.()}
      {renderPrice?.(isLoading)}
      {renderBadges?.()}
      {renderVariants?.()}
      {renderDescription?.()}
      {renderSeller?.()}
    </div>
  );
}
