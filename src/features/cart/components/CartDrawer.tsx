import React from "react";
import type { CartItem } from "../types";
import { Aside, Button, Heading, Span, Text } from "@mohasinac/ui";

interface CartItemRowProps {
  item: CartItem;
  onQtyChange?: (id: string, qty: number) => void;
  onRemove?: (id: string) => void;
}

export function CartItemRow({ item, onQtyChange, onRemove }: CartItemRowProps) {
  return (
    <div className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {item.meta.image && (
          <div
            role="img"
            aria-label={item.meta.title}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${item.meta.image})` }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <Text className="font-medium text-neutral-900 line-clamp-2">
          {item.meta.title}
        </Text>
        {item.meta.attributes &&
          Object.keys(item.meta.attributes).length > 0 && (
            <Text className="text-xs text-neutral-500">
              {Object.entries(item.meta.attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </Text>
          )}
        <div className="flex items-center justify-between">
          <Text className="font-semibold text-neutral-900">
            {item.meta.currency ?? "₹"}
            {(item.meta.price * item.quantity).toLocaleString()}
          </Text>
          {onQtyChange && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onQtyChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                variant="outline"
                size="sm"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-sm disabled:opacity-40"
              >
                −
              </Button>
              <Span className="min-w-[1.5rem] text-center text-sm">
                {item.quantity}
              </Span>
              <Button
                onClick={() => onQtyChange(item.id, item.quantity + 1)}
                variant="outline"
                size="sm"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-sm"
              >
                +
              </Button>
            </div>
          )}
        </div>
      </div>
      {onRemove && (
        <Button
          onClick={() => onRemove(item.id)}
          variant="ghost"
          size="sm"
          aria-label="Remove from cart"
          className="self-start text-neutral-400 transition hover:text-red-500"
        >
          ✕
        </Button>
      )}
    </div>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal?: number;
  currency?: string;
  isLoading?: boolean;
  onQtyChange?: (id: string, qty: number) => void;
  onRemove?: (id: string) => void;
  onCheckout?: () => void;
  labels?: {
    title?: string;
    empty?: string;
    checkout?: string;
    subtotal?: string;
  };
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  subtotal = 0,
  currency = "₹",
  isLoading,
  onQtyChange,
  onRemove,
  onCheckout,
  labels = {},
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <Aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <Heading level={2} className="text-lg font-semibold">
            {labels.title ?? "Cart"}
          </Heading>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close cart"
            className="text-neutral-500 hover:text-neutral-900"
          >
            ✕
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
            </div>
          ) : items.length === 0 ? (
            <Text className="py-12 text-center text-sm text-neutral-500">
              {labels.empty ?? "Your cart is empty"}
            </Text>
          ) : (
            items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onQtyChange={onQtyChange}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-neutral-200 p-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <Span className="text-neutral-600">
                {labels.subtotal ?? "Subtotal"}
              </Span>
              <Span className="font-semibold">
                {currency}
                {subtotal.toLocaleString()}
              </Span>
            </div>
            {onCheckout && (
              <Button
                onClick={onCheckout}
                variant="primary"
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                {labels.checkout ?? "Proceed to Checkout"}
              </Button>
            )}
          </div>
        )}
      </Aside>
    </>
  );
}
