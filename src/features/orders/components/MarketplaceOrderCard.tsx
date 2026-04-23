"use client"
import { useCallback } from "react";
import { Package } from "lucide-react";
import {
  Button,
  Caption,
  Span,
  StatusBadge,
  Text,
  TextLink,
} from "../../../ui";
import { formatCurrency, formatDate } from "../../../utils";
import { OrderStatusValues } from "../schemas";

const STATUS_MAP: Record<
  string,
  "pending" | "info" | "active" | "success" | "danger"
> = {
  pending: "pending",
  confirmed: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
};

export interface MarketplaceOrderCardOrder {
  id: string;
  status: string;
  orderDate: string | Date;
  totalPrice: number;
  currency?: string;
  productId?: string;
  productTitle?: string;
  trackingNumber?: string;
  items?: Array<unknown>;
}

export interface MarketplaceOrderCardLabels {
  orderNumber: string;
  placedOn: string;
  items: string;
  trackOrder: string;
  writeReview: string;
  viewOrder: string;
}

export interface MarketplaceOrderCardLinks {
  detailHref: (order: MarketplaceOrderCardOrder) => string;
  trackHref?: (order: MarketplaceOrderCardOrder) => string;
  reviewHref?: (order: MarketplaceOrderCardOrder) => string;
}

export interface MarketplaceOrderCardProps {
  order: MarketplaceOrderCardOrder;
  links?: MarketplaceOrderCardLinks;
  labels?: Partial<MarketplaceOrderCardLabels>;
  className?: string;
  variant?: "grid" | "list";
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onNavigate?: (href: string) => void;
}

const DEFAULT_LABELS: MarketplaceOrderCardLabels = {
  orderNumber: "Order",
  placedOn: "Placed on",
  items: "Items",
  trackOrder: "Track",
  writeReview: "Review",
  viewOrder: "View",
};

function defaultNavigate(href: string) {
  if (typeof window !== "undefined") {
    window.location.assign(href);
  }
}

export function MarketplaceOrderCard({
  order,
  links,
  labels,
  className = "",
  variant = "grid",
  selectable = false,
  isSelected = false,
  onSelect,
  onNavigate,
}: MarketplaceOrderCardProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const navigate = onNavigate ?? defaultNavigate;

  const orderId = order.id ?? "";
  const shortId = `#${orderId.slice(0, 8).toUpperCase()}`;
  const status = STATUS_MAP[order.status] ?? "pending";
  const statusLabel =
    order.status.charAt(0).toUpperCase() + order.status.slice(1);
  const isDelivered = order.status === OrderStatusValues.DELIVERED;
  const isShipped = order.status === OrderStatusValues.SHIPPED;

  const detailHref = links?.detailHref(order) ?? `/orders/${order.id}`;
  const trackHref = links?.trackHref?.(order);
  const reviewHref = links?.reviewHref?.(order);

  const handleSelect = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(orderId, !isSelected);
    },
    [orderId, isSelected, onSelect],
  );

  const isListVariant = variant === "list";
  const itemCount = order.items?.length ?? 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${isSelected ? "ring-2 ring-primary-500 dark:ring-primary-400" : ""} ${className}`}
     data-section="marketplaceordercard-div-411">
      {selectable && (
        <Button
          variant="ghost"
          aria-label={isSelected ? "Deselect order" : "Select order"}
          aria-pressed={isSelected}
          onClick={handleSelect}
          className={`absolute top-3 left-3 z-10 h-6 w-6 cursor-pointer rounded-md border-2 p-0 shadow-md transition-colors ${isSelected ? "border-primary bg-primary" : "border-zinc-400 bg-white/95 hover:border-primary dark:border-slate-500 dark:bg-slate-800/95"}`}
        >
          {isSelected && (
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </Button>
      )}

      <div
        className={`flex gap-4 p-4 ${isListVariant ? "flex-row items-center justify-between" : "flex-col"}`}
       data-section="marketplaceordercard-div-412">
        <div
          className={`flex items-start gap-3 ${selectable ? "pl-8" : ""} ${isListVariant ? "min-w-0 flex-1" : ""}`}
         data-section="marketplaceordercard-div-413">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-slate-800" data-section="marketplaceordercard-div-414">
            <Package className="h-5 w-5 text-zinc-500 dark:text-slate-400" />
          </div>
          <div className="min-w-0 space-y-1" data-section="marketplaceordercard-div-415">
            <TextLink href={detailHref} className="leading-tight">
              <Text weight="semibold" className="truncate">
                {order.productTitle ?? shortId}
              </Text>
            </TextLink>
            <Caption className="font-mono text-xs">
              {mergedLabels.orderNumber} {shortId}
            </Caption>
            <Caption className="text-xs">
              {mergedLabels.placedOn} {formatDate(order.orderDate)}
            </Caption>
            {itemCount > 1 && (
              <Caption className="text-xs">
                {mergedLabels.items}: <Span weight="medium">{itemCount}</Span>
              </Caption>
            )}
          </div>
        </div>

        <div
          className={`flex ${isListVariant ? "flex-shrink-0 items-center gap-4" : "flex-col gap-3"}`}
         data-section="marketplaceordercard-div-416">
          <div
            className={`flex ${isListVariant ? "items-center gap-4" : "flex-wrap items-center justify-between gap-3"}`}
           data-section="marketplaceordercard-div-417">
            <StatusBadge status={status} label={statusLabel} />
            <Text weight="semibold" className="tabular-nums">
              {formatCurrency(order.totalPrice, order.currency)}
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2" data-section="marketplaceordercard-div-418">
            {(isShipped || isDelivered) &&
              trackHref &&
              order.trackingNumber && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 px-2 text-xs"
                  onClick={() => navigate(trackHref)}
                >
                  {mergedLabels.trackOrder}
                </Button>
              )}
            {isDelivered && reviewHref && (
              <Button
                variant="outline"
                size="sm"
                className="min-w-0 flex-1 px-2 text-xs"
                onClick={() => navigate(reviewHref)}
              >
                {mergedLabels.writeReview}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="min-w-0 flex-1 px-2 text-xs"
              onClick={() => navigate(detailHref)}
            >
              {mergedLabels.viewOrder}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
