import { Div, Pagination, Row, Span, Stack, Text } from "../../../ui";
import type { Order, OrderStatus } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { THEME_CONSTANTS } from "../../../tokens";

const CLS_PRIZE_BADGE = "inline-flex items-center rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 px-2.5 py-0.5 text-fuchsia-700 dark:text-fuchsia-300";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-warning-surface text-warning",
  confirmed: "bg-info-surface text-info",
  processing: "bg-info-surface text-info",
  shipped: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  delivered: "bg-success-surface text-success",
  cancelled: "bg-error-surface text-error",
  refunded: "bg-warning-surface text-warning",
  return_requested: "bg-warning-surface text-warning",
  returned: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
};

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  labels?: Record<string, string>;
}

export function OrderCard({ order, onClick, labels = {} }: OrderCardProps) {
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const statusColor =
    STATUS_COLORS[order.orderStatus] ?? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

  // SB8-F — count unrevealed prize-draw entries to surface a "reveals pending" badge.
  const unrevealedPrizeDraws = order.items.filter(
    (it) =>
      it.listingType === "prize-draw" &&
      it.prizeRevealStatus !== undefined &&
      it.prizeRevealStatus !== "revealed",
  );
  const revealsRemaining = unrevealedPrizeDraws.length;
  const earliestDeadline = unrevealedPrizeDraws
    .map((it) => it.prizeRevealDeadline)
    .filter((d): d is string => !!d)
    .sort()[0];

  return (
    <Div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(order)
          : undefined
      }
      onClick={onClick ? () => onClick(order) : undefined}
      className={`border border-neutral-200 p-5 ${onClick ? "cursor-pointer transition hover:shadow-md" : ""}`} rounded="xl" surface="default"
    >
      <Row wrap align="start" justify="between" gap="3">
        <Div>
          <Text className="text-neutral-500" size="xs">
            Order #{order.id.slice(-8).toUpperCase()}
          </Text>
          {date && (
            <Text className="mt-0.5" color="faint" size="xs">{date}</Text>
          )}
        </Div>
        <Span
          size="xs" weight="semibold"
          className={`rounded-full px-3 py-1 capitalize ${statusColor}`}
        >
          {labels[order.orderStatus] ?? order.orderStatus.replace(/_/g, " ")}
        </Span>
      </Row>
      {revealsRemaining > 0 && (
        <Row gap="sm" className="mt-2">
          <Span size="xs" weight="semibold" className={CLS_PRIZE_BADGE}>
            {revealsRemaining} {revealsRemaining === 1 ? "reveal" : "reveals"} pending
          </Span>
          {earliestDeadline && (
            <Span size="xs" color="muted">
              before {new Date(earliestDeadline).toLocaleDateString(getDefaultLocale(), { month: "short", day: "numeric" })}
            </Span>
          )}
        </Row>
      )}
      <Row wrap gap="3" className="mt-4">
        {order.items.slice(0, 3).map((item, i) => (
          <Row key={i} gap="sm">
            {item.image && (
              <Div
                role="img"
                aria-label={item.title}
                className="h-10 w-10 bg-center bg-cover" rounded="lg"
                // audit-inline-style-ok: dynamic image URL
                style={{ backgroundImage: `url(${item.image})` }}
              />
            )}
            <Div>
              <Text className={`text-neutral-900 dark:text-zinc-100 ${THEME_CONSTANTS.utilities.textClamp1}`} size="sm" weight="medium">
                {item.title}
              </Text>
              <Text size="xs" color="faint">×{item.quantity}</Text>
            </Div>
          </Row>
        ))}
        {order.items.length > 3 && (
          <Span size="xs" className="self-center" color="faint">
            +{order.items.length - 3} more
          </Span>
        )}
      </Row>
        <Row justify="between" className="mt-4 border-t border-neutral-100" padding="t-sm">
          <Span size="sm" className="text-neutral-500">
          {order.currency ?? ""} Total
        </Span>
          <Span weight="semibold" className="text-neutral-900">
          {formatCurrency(order.total, order.currency)}
        </Span>
      </Row>
    </Div>
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
      <Stack gap="md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Div
            key={i}
            className="animate-pulse border border-neutral-200 p-5" rounded="xl"
          >
            <Row justify="between">
              <Stack gap="xs">
                <Div className="h-3 w-20 bg-neutral-200" rounded="default" />
                <Div className="h-3 w-16 bg-neutral-200" rounded="default" />
              </Stack>
              <Div className="h-6 w-20 bg-neutral-200" rounded="full" />
            </Row>
            <Div className="mt-4 flex gap-3">
              <Div className="h-10 w-10 bg-neutral-200" rounded="lg" />
              <Div className="h-10 w-10 bg-neutral-200" rounded="lg" />
            </Div>
          </Div>
        ))}
      </Stack>
    );
  }

  if (orders.length === 0) {
    return (
      <Text className="py-12" color="muted" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap="md">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onClick={onOrderClick} />
        ))}
      </Stack>
      {totalPages > 1 && onPageChange && (
        <Row justify="center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Row>
      )}
    </Stack>
  );
}
