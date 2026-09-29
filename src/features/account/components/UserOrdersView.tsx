"use client";

import { sortBy, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../constants/index";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { Button, Div, FilterChipGroup, Grid, Stack, Text, TextLink } from "../../../ui";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { OrderCard } from "../../orders/components/OrdersList";
import type { Order } from "../../orders/types";
import { useOrderScope } from "../../orders/components/OrderScopeTabs";
import { useSearchParams } from "next/navigation";

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed", "processing"]);
const TRACKABLE_STATUSES = new Set(["shipped"]);

const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest first" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest first" },
  { value: sortBy("totalPrice", "DESC"), label: "Highest total" },
  { value: sortBy("totalPrice", "ASC"), label: "Lowest total" },
];

/**
 * Lane tabs — the same auction > offer > standard split the cart and checkout
 * use, viewed after the fact. Every `id` is EXACTLY a stored
 * `OrderDocument.orderType` value (or "" for All): a tab id that doesn't
 * match a real stored value returns zero rows forever with no error anywhere
 * (CLAUDE.md Root Cause #33).
 *
 * "standard" is filtered in memory server-side, because orders written before
 * `orderType` existed have no such field and a Firestore `==` would exclude
 * every one of them.
 */
const ORDER_LANE_TABS = [
  { id: "", label: "All" },
  { id: "standard", label: "Normal" },
  { id: "auction", label: "Auction wins" },
  { id: "offer", label: "Offer wins" },
] as const;

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
  const orderScope = useOrderScope();

  /*
   * 🛑 A FILTERED empty result is not an empty account, and saying so is a lie
   * the buyer has no way to check.
   *
   * Both empty states here read "You haven't placed any orders yet." That is
   * correct for a new account and flatly wrong the moment a search or a status
   * chip is what emptied the list. Measured: /user/orders?q=zzzznope on an
   * account with roughly thirty real orders rendered exactly that sentence — a
   * buyer searching for an order they could not find would reasonably conclude
   * their whole history had gone.
   *
   * Same shape as the poll leaderboard fixed earlier in this run, where a
   * withheld tally rendered as "No votes yet." beside a participant count of
   * 365: an empty result must not be reported as an absolute zero when a filter
   * is the reason.
   *
   * Read from the URL rather than threaded through `renderCards`, whose
   * signature is `(rows, view, selection, isLoading)` and carries no filter
   * state. `useUrlTable`/`useSearchParams` hold no local state, so a second
   * reader against the same URL stays in sync with the listing's own
   * (CLAUDE.md, Root Cause #35).
   */
  const searchParams = useSearchParams();
  const hasNarrowingFilter = ["q", "search", "status", "orderType", "filters"].some(
    (k) => Boolean(searchParams.get(k)),
  );
  const emptyMessage = hasNarrowingFilter
    ? "No orders match your search or filters."
    : "You haven't placed any orders yet.";

  const config: ListingViewConfig<OrdersListResponse, Order> = {
    portal: "user",
    title: "My Orders",
    search: {
      placeholder: "Search by order id…",
      // `/api/user/orders` filters in memory on `o.id` and nothing else — not
      // the product titles the rows display, which is what a buyer would try
      // first. Saying "order id" is the honest promise until the route can
      // match more.
      fields: ["id"],
    },
    emptyLabel: emptyMessage,
    filterKeys: ["status", "orderType"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["user", "orders", "listing"],
    endpoint: ACCOUNT_ENDPOINTS.ORDERS,
    sortOptions: SORT_OPTIONS,
    hideTableView: true,
    mapRows: (response) => response.items ?? [],
    getTotal: (response, rows) => response.total ?? rows.length,
    buildFilters: (state) =>
      [
        state.status ? sieveFilter("status", SIEVE_OP.EQ, state.status) : null,
        state.orderType ? sieveFilter("orderType", SIEVE_OP.EQ, state.orderType) : null,
      ]
        .filter(Boolean)
        .join(",") || undefined,
    // The lifecycle scope sits alongside the lane tabs as a second,
    // independent axis: a buyer can ask "which of my auction wins are still
    // in flight" without those two questions fighting over one control.
    buildExtraParams: () => orderScope.extraParams,
    renderAboveContent: orderScope.renderAboveContent,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="md">
        <FilterChipGroup
          label="Type"
          tabs={ORDER_LANE_TABS as unknown as { id: string; label: string }[]}
          value={pendingFilters.orderType ?? ""}
          onChange={(id) => setPendingFilters((prev) => ({ ...prev, orderType: id }))}
        />
      <Div>
        <PaginatedSelect
          value={pendingFilters.status || null}
          onChange={(v) => setPendingFilters((p) => ({ ...p, status: v ?? "" }))}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          ariaLabel="Filter by order status"
        />
      </Div>
      </Stack>
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
        return <Text color="muted">{emptyMessage}</Text>;
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
