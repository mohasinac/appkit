import { Div, Pagination, Row, Span, Stack, Text } from "../../../ui";
import type { Order, OrderStatus } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { THEME_CONSTANTS } from "../../../tokens";

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
    ? new Date(order.createdAt).toLocaleDateString(getDefaultLocale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const statusColor =
    STATUS_COLORS[order.orderStatus] ?? "bg-neutral-100 text-neutral-700";

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
      className={`rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 ${onClick ? "cursor-pointer transition hover:shadow-md" : ""}`}
    >
      <Row wrap align="start" justify="between" gap="3">
        <Div>
          <Text className="text-xs text-neutral-500 dark:text-zinc-400">
            Order #{order.id.slice(-8).toUpperCase()}
          </Text>
          {date && (
            <Text className="mt-0.5 text-xs text-neutral-400 dark:text-zinc-500">{date}</Text>
          )}
        </Div>
        <Span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor}`}
        >
          {labels[order.orderStatus] ?? order.orderStatus.replace(/_/g, " ")}
        </Span>
      </Row>
      <Row wrap gap="3" className="mt-4">
        {order.items.slice(0, 3).map((item, i) => (
          <Row key={i} className="gap-2">
            {item.image && (
              <Div
                role="img"
                aria-label={item.title}
                className="h-10 w-10 rounded-lg bg-center bg-cover"
                style={{ backgroundImage: `url(${item.image})` }}
              />
            )}
            <Div>
              <Text className={`text-sm font-medium text-neutral-900 dark:text-zinc-100 ${THEME_CONSTANTS.utilities.textClamp1}`}>
                {item.title}
              </Text>
              <Text className="text-xs text-neutral-400 dark:text-zinc-500">×{item.quantity}</Text>
            </Div>
          </Row>
        ))}
        {order.items.length > 3 && (
          <Span className="self-center text-xs text-neutral-400 dark:text-zinc-500">
            +{order.items.length - 3} more
          </Span>
        )}
      </Row>
        <Row justify="between" className="mt-4 border-t border-neutral-100 dark:border-slate-700 pt-3">
          <Span className="text-sm text-neutral-500 dark:text-zinc-400">
          {order.currency ?? ""} Total
        </Span>
          <Span className="font-semibold text-neutral-900 dark:text-zinc-100">
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
            className="animate-pulse rounded-xl border border-neutral-200 dark:border-slate-700 p-5"
          >
            <Div className="flex justify-between">
              <Stack gap="xs">
                <Div className="h-3 w-20 rounded bg-neutral-200 dark:bg-slate-700" />
                <Div className="h-3 w-16 rounded bg-neutral-200 dark:bg-slate-700" />
              </Stack>
              <Div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-slate-700" />
            </Div>
            <Div className="mt-4 flex gap-3">
              <Div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-slate-700" />
              <Div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-slate-700" />
            </Div>
          </Div>
        ))}
      </Stack>
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
    <Stack gap="lg">
      <Stack gap="md">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onClick={onOrderClick} />
        ))}
      </Stack>
      {totalPages > 1 && onPageChange && (
        <Div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Div>
      )}
    </Stack>
  );
}
