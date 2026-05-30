"use client"
import { useCallback } from "react";
import { Package } from "lucide-react";
import {
  BaseListingCard,
  Caption,
  Div,
  Span,
  StatusBadge,
  Text,
  TextLink,
  Button,
} from "../../../ui";
import { formatCurrency, formatDate } from "../../../utils";
import { OrderStatusValues } from "../schemas";
import { useLongPress } from "../../../react/hooks/useLongPress";

const CLS_ACTION_BUTTON = "min-w-0 flex-1 px-2 text-xs";

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

  const longPress = useLongPress(() => onSelect?.(orderId, !isSelected));

  const isListVariant = variant === "list";
  const itemCount = order.items?.length ?? 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${isSelected ? "ring-2 ring-primary-500 dark:ring-primary-400" : ""} ${className}`}
      onMouseDown={onSelect && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={onSelect && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={onSelect && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={onSelect && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={onSelect && !isSelected ? longPress.onTouchEnd : undefined}
     data-section="marketplaceordercard-div-411">
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={handleSelect}
          label={isSelected ? "Deselect order" : "Select order"}
          position="top-2 left-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}

      <div
        className={`flex gap-4 p-4 ${isListVariant ? "flex-row items-center justify-between" : "flex-col"}`}
       data-section="marketplaceordercard-div-412">
        <div
          className={`flex items-start gap-3 ${selectable ? "pl-8" : ""} ${isListVariant ? "min-w-0 flex-1" : ""}`}
         data-section="marketplaceordercard-div-413">
          <Div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-slate-800">
            <Package className="h-5 w-5 text-zinc-500 dark:text-slate-400" />
          </Div>
          <Div className="min-w-0 space-y-1">
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
          </Div>
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

          <Div className="flex flex-wrap items-center gap-2">
            {(isShipped || isDelivered) &&
              trackHref &&
              order.trackingNumber && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={CLS_ACTION_BUTTON}
                  onClick={() => navigate(trackHref)}
                >
                  {mergedLabels.trackOrder}
                </Button>
              )}
            {isDelivered && reviewHref && (
              <Button
                variant="outline"
                size="sm"
                className={CLS_ACTION_BUTTON}
                onClick={() => navigate(reviewHref)}
              >
                {mergedLabels.writeReview}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className={CLS_ACTION_BUTTON}
              onClick={() => navigate(detailHref)}
            >
              {mergedLabels.viewOrder}
            </Button>
          </Div>
        </div>
      </div>
    </div>
  );
}
