import React from "react";
import { Button, Text } from "@mohasinac/ui";
import type { WishlistItem } from "../types";

interface WishlistCardProps {
  item: WishlistItem;
  onRemove?: (id: string) => void;
  onProductClick?: (item: WishlistItem) => void;
}

export function WishlistCard({
  item,
  onRemove,
  onProductClick,
}: WishlistCardProps) {
  return (
    <div className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div
        role={onProductClick ? "button" : undefined}
        tabIndex={onProductClick ? 0 : undefined}
        onClick={onProductClick ? () => onProductClick(item) : undefined}
        onKeyDown={
          onProductClick
            ? (e) => e.key === "Enter" && onProductClick(item)
            : undefined
        }
        className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 ${onProductClick ? "cursor-pointer" : ""}`}
      >
        {item.productImage && (
          <div
            role="img"
            aria-label={item.productTitle ?? ""}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${item.productImage})` }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <Text className="font-medium text-neutral-900 line-clamp-2">
          {item.productTitle}
        </Text>
        {item.productPrice !== undefined && (
          <Text className="text-sm font-semibold text-neutral-900">
            {item.productCurrency ?? "₹"}
            {item.productPrice.toLocaleString()}
          </Text>
        )}
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          aria-label="Remove from wishlist"
          className="self-start text-neutral-400 transition hover:text-red-500"
        >
          ✕
        </Button>
      )}
    </div>
  );
}

interface WishlistPageProps {
  items: WishlistItem[];
  isLoading?: boolean;
  onRemove?: (id: string) => void;
  onProductClick?: (item: WishlistItem) => void;
  emptyLabel?: string;
}

export function WishlistPage({
  items,
  isLoading,
  onRemove,
  onProductClick,
  emptyLabel = "Your wishlist is empty",
}: WishlistPageProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 rounded-xl border border-neutral-200 p-4"
          >
            <div className="h-20 w-20 rounded-lg bg-neutral-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-neutral-200" />
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Text className="py-16 text-center text-sm text-neutral-500">{emptyLabel}</Text>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <WishlistCard
          key={item.id}
          item={item}
          onRemove={onRemove}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  );
}
