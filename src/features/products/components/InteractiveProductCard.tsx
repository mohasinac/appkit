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
  /**
   * Owner-only pencil / clone / bin. Forwarded to ProductCard, which renders
   * it OUTSIDE its own and this component's `<Link>` wrappers — see its return
   * statement. Renders nothing for a visitor who does not own the listing.
   */
  renderOwnerActions?: () => React.ReactNode;
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
  renderOwnerActions,
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
        renderOwnerActions={renderOwnerActions}
      />
    );
  }
  /*
   * 🛑 The owner toolbar is a SIBLING of this Link, not a child of it.
   *
   * ProductCard already keeps the toolbar outside its OWN anchor, but this
   * branch adds a second one around the whole card — so handing the slot down
   * would still nest buttons inside an `<a>`. Rendering it here, over a
   * relative wrapper, is the only placement that escapes both.
   */
  const card = (
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
  if (!renderOwnerActions) return card;
  return (
    <div className="relative h-full">
      {card}
      <div className="absolute right-2 top-14 z-20">{renderOwnerActions()}</div>
    </div>
  );
}
