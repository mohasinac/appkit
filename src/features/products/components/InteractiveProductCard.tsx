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
  return (
    <Link
      href={href}
      className={[
        "block",
        selectable ? "cursor-pointer" : "",
        isSelected ? "ring-2 ring-primary-600" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={
        selectable && onSelect
          ? (e) => {
              e.preventDefault();
              onSelect(product.id, !isSelected);
            }
          : undefined
      }
    >
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
