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
import { ORDER_LANE_TABS } from "../../orders/constants/order-lane-tabs";
import { useSearchParams } from "next/navigation";

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed", "processing"]);
/*
 * 🛑 Every PRE-DELIVERY status, not just "shipped".
 *
 * It was `["shipped"]` alone, so a buyer whose order was pending, confirmed
 * or processing had no "where is it" link at all — which is precisely when
 * they most want one. The timeline on the track page reads correctly for all
 * of these: it shows the stages reached and the stages still ahead.
 *
 * Delivered, cancelled, refunded and returned are excluded because tracking a
 * finished order is the order detail page's job, not a courier's.
 */
const TRACKABLE_STATUSES = new Set([
  "pending",
  "confirmed",
  "processing",
  "shipped",
]);

const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest first" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest first" },
  { value: sortBy("totalPrice", "DESC"), label: "Highest total" },
  { value: sortBy("totalPrice", "ASC"), label: "Lowest total" },
];

/*
 * Lane tabs now come from `features/orders/constants/order-lane-tabs`, shared
 * with the seller's order list.
 *
 * They were defined here as a local array literal, which meant the seller's
 * list could not have them without a tenth hand-written copy of one union
 * (Root Cause #61). The shared version derives from a
 * `Record<OrderType, string>`, so a sixth lane is a compile error rather than
 * a tab that silently never appears — which is the bug this array already had
 * once, shipping four tabs for five lanes.
 *
 * Every id-correctness note that lived here (byte-exact stored values, the
 * unhyphenated `preorder`, and the in-memory `standard` filter) moved with it.
 */

/**
 * Payment-method tabs — a THIRD axis, independent of the lane tabs above and
 * the lifecycle scope beside them.
 *
 * 🛑 EMI is not a lane and not a status, which is why it could not join
 * either existing control: `orderType` records how the order was WON
 * (standard / auction / offer) and the scope records where it IS. How it is
 * being PAID is orthogonal to both — an auction win can be on an EMI plan.
 *
 * Every id is exactly a stored `OrderDocument.paymentMethod` value, and
 * `paymentMethod` is `canFilter: true` in the orders SIEVE_FIELDS — checked
 * before wiring this, because an unallowlisted field does not raise: the
 * clause is silently dropped and the chip returns the ENTIRE order list while
 * looking like a filter (Root Cause #62).
 */
const PAYMENT_METHOD_TABS = [
  { id: "", label: "Any" },
  { id: "emi", label: "EMI plans" },
  { id: "cod", label: "Cash on delivery" },
  { id: "online", label: "Paid online" },
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
  const hasNarrowingFilter = ["q", "search", "status", "orderType", "paymentMethod", "filters"].some(
    (k) => Boolean(searchParams.get(k)),
  );
  const emptyMessage = hasNarrowingFilter
    ? "No orders match your search or filters."
    : "You haven't placed any orders yet.";

  const config: ListingViewConfig<OrdersListResponse, Order> = {
    portal: "user",
    title: "My Orders",
    search: {
      placeholder: "Search by item or order id…",
      /*
       * The route now matches product titles as well as the order id, so the
       * placeholder can promise it. It said "order id" because that was all
       * the route could do, with a comment calling that "the honest promise
       * until the route can match more" — this is the promise catching up,
       * not a widened claim.
       */
      fields: ["id", "productTitle"],
    },
    emptyLabel: emptyMessage,
    filterKeys: ["status", "orderType", "paymentMethod"],
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
        state.paymentMethod ? sieveFilter("paymentMethod", SIEVE_OP.EQ, state.paymentMethod) : null,
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
          // No cast: `FilterChipGroup.tabs` is `readonly FilterChipGroupTab[]`,
          // which the shared constant already satisfies. The `as unknown as`
          // here was working around the local `as const` literal, not a real
          // mismatch.
          tabs={ORDER_LANE_TABS}
          value={pendingFilters.orderType ?? ""}
          onChange={(id) => setPendingFilters((prev) => ({ ...prev, orderType: id }))}
        />
        <FilterChipGroup
          label="Payment"
          tabs={PAYMENT_METHOD_TABS as unknown as { id: string; label: string }[]}
          value={pendingFilters.paymentMethod ?? ""}
          onChange={(id) => setPendingFilters((prev) => ({ ...prev, paymentMethod: id }))}
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
