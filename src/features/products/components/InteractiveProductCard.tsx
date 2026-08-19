import React from "react";
import Link from "next/link";
import { ProductCard } from "./ProductGrid";
import type { ProductItem } from "../types";

export interface InteractiveProductCardProps {
  product: ProductItem;
  /** Route href — passed from the consumer (e.g. ROUTES.PUBLIC.PRODUCT_DETAIL) */
  href: string;
  className?: string;
  variant?: "grid" | "card" | "fluid" | "list";
  /** Enables selection mode; prevents navigation and calls onSelect instead */
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  onAddToCart?: (product: ProductItem) => void;
  onBuyNow?: (product: ProductItem) => void;
}

export function InteractiveProductCard({
  product,
  href,
  className,
  selectable,
  isSelected,
  onSelect,
  isWishlisted = false,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
}: InteractiveProductCardProps) {
  // When selection is enabled, render ProductCard directly so its built-in
  // checkbox + long-press (BaseListingCard.Checkbox) work. `href` is still
  // forwarded here (not just in the plain-Link branch below) — ProductCard's
  // own `if (href && !selectionMode) return <Link>...` only wraps in a Link
  // when nothing is actively selected, so passing href unconditionally keeps
  // the card navigable whenever a selection handler is merely wired but not
  // active, instead of silently losing all click/tap navigation the instant
  // `onSelect` is provided at all (see Root Cause Pattern: selectable-card
  // navigation must not depend on a selection callback being present).
  if (onSelect) {
    return (
      <ProductCard
        product={product}
        href={href}
        className={className}
        isWishlisted={isWishlisted}
        onAddToWishlist={onToggleWishlist}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
        selectionMode={selectable}
        isSelected={isSelected}
        onSelect={(id) => onSelect(id, !isSelected)}
      />
    );
  }
  return (
    <Link href={href} className="block">
      <ProductCard
        product={product}
        className={className}
        isWishlisted={isWishlisted}
        onAddToWishlist={onToggleWishlist}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
      />
    </Link>
  );
}
