"use client";

import { sortBy } from "../../../constants/sort";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { Div, Grid, Stack, Text } from "../../../ui";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { OrderCard } from "../../orders/components/OrdersList";
import type { Order } from "../../orders/types";

const SORT_OPTIONS = [
  { value: sortBy("updatedAt", "DESC"), label: "Recently updated" },
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
];

interface OrdersListResponse {
  items?: Order[];
  total?: number;
}

export interface UserReturnsViewProps {
  onOrderClick?: (order: Order) => void;
}

export function UserReturnsView({ onOrderClick }: UserReturnsViewProps) {
  const config: ListingViewConfig<OrdersListResponse, Order> = {
    portal: "user",
    title: "Returns & Refunds",
    searchPlaceholder: "Search by order id…",
    emptyLabel: "You have no return or refund requests.",
    filterKeys: [],
    defaultSort: sortBy("updatedAt", "DESC"),
    queryKey: ["user", "returns", "listing"],
    endpoint: `${ACCOUNT_ENDPOINTS.ORDERS}?filters=status==return_requested`,
    sortOptions: SORT_OPTIONS,
    hideTableView: true,
    mapRows: (response) => response.items ?? [],
    getTotal: (response, rows) => response.total ?? rows.length,
    buildFilters: () => undefined,
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
        return <Text color="muted">You have no return or refund requests.</Text>;
      }
      return (
        <Grid gap="md" className="grid-cols-1">
          {rows.map((order) => (
            <OrderCard key={order.id} order={order} onClick={onOrderClick} />
          ))}
        </Grid>
      );
    },
  };

  return <DataListingView config={config} />;
}
