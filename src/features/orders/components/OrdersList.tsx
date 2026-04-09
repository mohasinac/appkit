import React from "react";
import { Button, Span, Text } from "@mohasinac/ui";
import type { Order, OrderStatus } from "../types";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-orange-100 text-orange-700",
  return_requested: "bg-amber-100 text-amber-700",
  returned: "bg-neutral-100 text-neutral-600",
};

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  labels?: Record<string, string>;
}

export function OrderCard({ order, onClick, labels = {} }: OrderCardProps) {
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const statusColor =
    STATUS_COLORS[order.orderStatus] ?? "bg-neutral-100 text-neutral-700";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(order)
          : undefined
      }
      onClick={onClick ? () => onClick(order) : undefined}
      className={`rounded-xl border border-neutral-200 bg-white p-5 ${onClick ? "cursor-pointer transition hover:shadow-md" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text className="text-xs text-neutral-500">
            Order #{order.id.slice(-8).toUpperCase()}
          </Text>
          {date && (
            <Text className="mt-0.5 text-xs text-neutral-400">{date}</Text>
          )}
        </div>
        <Span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor}`}
        >
          {labels[order.orderStatus] ?? order.orderStatus.replace(/_/g, " ")}
        </Span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {order.items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {item.image && (
              <div
                role="img"
                aria-label={item.title}
                className="h-10 w-10 rounded-lg bg-center bg-cover"
                style={{ backgroundImage: `url(${item.image})` }}
              />
            )}
            <div>
              <Text className="text-sm font-medium text-neutral-900 line-clamp-1">
                {item.title}
              </Text>
              <Text className="text-xs text-neutral-400">×{item.quantity}</Text>
            </div>
          </div>
        ))}
        {order.items.length > 3 && (
          <Span className="self-center text-xs text-neutral-400">
            +{order.items.length - 3} more
          </Span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
        <Span className="text-sm text-neutral-500">{order.currency} Total</Span>
        <Span className="font-semibold text-neutral-900">
          {order.currency}
          {order.total.toLocaleString()}
        </Span>
      </div>
    </div>
  );
}

interface OrdersListProps {
  orders: Order[];
  isLoading?: boolean;
  onOrderClick?: (order: Order) => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: string;
}

export function OrdersList({
  orders,
  isLoading,
  onOrderClick,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  emptyLabel = "No orders found",
}: OrdersListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-neutral-200 p-5"
          >
            <div className="flex justify-between">
              <div className="space-y-1">
                <div className="h-3 w-20 rounded bg-neutral-200" />
                <div className="h-3 w-16 rounded bg-neutral-200" />
              </div>
              <div className="h-6 w-20 rounded-full bg-neutral-200" />
            </div>
            <div className="mt-4 flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-neutral-200" />
              <div className="h-10 w-10 rounded-lg bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Text className="py-12 text-center text-sm text-neutral-500">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onClick={onOrderClick} />
        ))}
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              type="button"
              variant={p === currentPage ? "primary" : "outline"}
              size="sm"
              onClick={() => onPageChange(p)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition ${p === currentPage ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"}`}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
