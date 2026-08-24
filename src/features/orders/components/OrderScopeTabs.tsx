"use client";
/*
 * WHY: See `../constants/order-scope`. This is the UI half — the same
 *      three-tab affordance the listing surfaces got, with the vocabulary
 *      orders actually have (a lifecycle, not availability).
 *
 * WHAT: `<OrderScopeTabs>` plus `useOrderScope()`, which returns exactly the
 *       fields a `ListingViewConfig` needs — matching `useAvailabilityScope`'s
 *       shape so the two read the same at every call site.
 *
 * EXPORTS: OrderScopeTabs, useOrderScope, OrderScopeState
 *
 * @tag domain:orders
 * @tag layer:ui
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AdminOrdersView,SellerOrdersView,UserOrdersView
 * @tag sideEffects:url-mutation
 */

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../ui";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { TABLE_KEYS } from "../../../constants/table-keys";
import {
  ORDER_SCOPE_TABS,
  ORDER_SCOPE_VALUES,
  isOrderScope,
  type OrderScope,
} from "../constants/order-scope";

export function OrderScopeTabs({ className }: { className?: string }) {
  const table = useUrlTable();
  const raw = table.get(TABLE_KEYS.ORDER_SCOPE);
  const active: OrderScope = isOrderScope(raw) ? raw : ORDER_SCOPE_VALUES.ACTIVE;

  return (
    <Tabs
      value={active}
      // A single `set` — `useUrlTable.set` already resets the page, and a
      // follow-up `setPage` would read stale searchParams and overwrite this
      // update (Root Cause #13).
      onChange={(next) => table.set(TABLE_KEYS.ORDER_SCOPE, next)}
      className={className}
    >
      <TabsList>
        {ORDER_SCOPE_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export interface OrderScopeState {
  scope: OrderScope;
  /** Spread into `ListingViewConfig.buildExtraParams`'s return value. */
  extraParams: { orderScope: OrderScope };
  /** Assign to `ListingViewConfig.renderAboveContent`. */
  renderAboveContent: () => React.ReactNode;
}

/**
 * Same seam as `useAvailabilityScope`: `buildExtraParams`, not `filterKeys`.
 * Registering the scope as a filter key would inflate the filter-drawer badge
 * for a tab selection and let the drawer's Clear button silently reset it.
 */
export function useOrderScope(): OrderScopeState {
  const table = useUrlTable();
  const raw = table.get(TABLE_KEYS.ORDER_SCOPE);
  const scope: OrderScope = isOrderScope(raw) ? raw : ORDER_SCOPE_VALUES.ACTIVE;

  return {
    scope,
    extraParams: { orderScope: scope },
    renderAboveContent: () => <OrderScopeTabs />,
  };
}
