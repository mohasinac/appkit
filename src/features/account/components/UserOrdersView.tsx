"use client";

import { sortBy, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../constants/index";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { Button, Div, Grid, Stack, Text, TextLink } from "../../../ui";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { OrderCard } from "../../orders/components/OrdersList";
import type { Order } from "../../orders/types";

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed", "processing"]);
const TRACKABLE_STATUSES = new Set(["shipped"]);

const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest first" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest first" },
  { value: sortBy("totalPrice", "DESC"), label: "Highest total" },
  { value: sortBy("totalPrice", "ASC"), label: "Lowest total" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "return_requested", label: "Return requested" },
];

interface OrdersListResponse {
  items?: Order[];
  total?: number;
}

export interface UserOrdersViewProps {
  onOrderClick?: (order: Order) => void;
}

export function UserOrdersView({ onOrderClick }: UserOrdersViewProps) {
  const config: ListingViewConfig<OrdersListResponse, Order> = {
    portal: "user",
    title: "My Orders",
    searchPlaceholder: "Search by order id…",
    emptyLabel: "You haven't placed any orders yet.",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["user", "orders", "listing"],
    endpoint: ACCOUNT_ENDPOINTS.ORDERS,
    sortOptions: SORT_OPTIONS,
    hideTableView: true,
    mapRows: (response) => response.items ?? [],
    getTotal: (response, rows) => response.total ?? rows.length,
    buildFilters: (state) => (state.status ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Div>
        <PaginatedSelect
          value={pendingFilters.status || null}
          onChange={(v) => setPendingFilters((p) => ({ ...p, status: v ?? "" }))}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          ariaLabel="Filter by order status"
        />
      </Div>
    ),
    renderCards: (rows, _view, _selection, isLoading) => {
      if (isLoading) {
        return (
          <Stack gap="md">
            {Array.from({ length: 3 }).map((_, i) => (
              <Div key={i} className="h-24 animate-pulse border border-[var(--appkit-color-border)]" rounded="xl" />
            ))}
          </Stack>
        );
      }
      if (rows.length === 0) {
        return <Text color="muted">You haven't placed any orders yet.</Text>;
      }
      return (
        <Grid gap="md" className="grid-cols-1">
          {rows.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={onOrderClick}
              renderActions={() => (
                <>
                  <Button asChild variant="outline" size="sm">
                    <TextLink href={String(ROUTES.USER.ORDER_DETAIL(order.id))}>
                      {ACTIONS.USER["view-order"].label}
                    </TextLink>
                  </Button>
                  {TRACKABLE_STATUSES.has(order.orderStatus) && (
                    <Button asChild variant="ghost" size="sm">
                      <TextLink href={String(ROUTES.USER.ORDER_TRACK(order.id))}>
                        {ACTIONS.USER["track-order"].label}
                      </TextLink>
                    </Button>
                  )}
                  {CANCELLABLE_STATUSES.has(order.orderStatus) && (
                    <Button asChild variant="ghost" size="sm">
                      <TextLink href={String(ROUTES.USER.ORDER_CANCEL(order.id))}>
                        {ACTIONS.USER["cancel-order"].label}
                      </TextLink>
                    </Button>
                  )}
                </>
              )}
            />
          ))}
        </Grid>
      );
    },
  };

  return <DataListingView config={config} />;
}
