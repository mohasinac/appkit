/*
 * WHY: Filtering orders meant picking one of seven individual statuses, on
 *      every order dashboard. The overwhelmingly common questions — "what still
 *      needs someone to act on it" and "what is finished" — had no answer at
 *      all, and the per-view status arrays had drifted from the real union
 *      anyway (`SELLER_ORDER_STATUS_TABS` omitted `confirmed`, a status the
 *      seller's own Update-Status dropdown could SET, so a seller could put an
 *      order into a state they could then never filter for).
 *
 * WHAT: A lifecycle scope — Active / Closed / All — that groups the nine real
 *       statuses. The buyer, seller and admin order lists all render the same
 *       three tabs, and the detailed status chips remain underneath as the
 *       drill-down.
 *
 * EXPORTS: ORDER_SCOPE_VALUES, OrderScope, isOrderScope, statusesForScope,
 *          ORDER_SCOPE_TABS
 *
 * @tag domain:orders
 * @tag layer:constants
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminOrdersView,SellerOrdersView,UserOrdersView,api/user/orders
 * @tag sideEffects:none
 */

// NOT from the "@mohasinac/appkit" barrel: that re-exports the NARROWER
// `OrderStatus` declared in features/account, which is missing
// `return_requested` and carries a `placed` value no order ever has
// (Recurrent Root Cause #36). The map below must be keyed on the real union.
import type { OrderStatus } from "../types/index";
import { OrderStatusValues } from "../schemas/firestore";

export const ORDER_SCOPE_VALUES = {
  /** Still moving — someone (buyer, seller or admin) has something to do. */
  ACTIVE: "active",
  /** Terminal — delivered, cancelled, refunded or returned. */
  CLOSED: "closed",
  /** No lifecycle predicate. */
  ALL: "all",
} as const;

export type OrderScope = (typeof ORDER_SCOPE_VALUES)[keyof typeof ORDER_SCOPE_VALUES];

export function isOrderScope(value: string): value is OrderScope {
  return (Object.values(ORDER_SCOPE_VALUES) as string[]).includes(value);
}

/**
 * Every status belongs to exactly one scope.
 *
 * `Record<OrderStatus, …>` on purpose: adding a tenth status is then a COMPILE
 * error rather than a status that silently belongs to neither tab and
 * disappears from both (Root Cause #61).
 */
const STATUS_SCOPE: Record<OrderStatus, "active" | "closed"> = {
  pending: "active",
  confirmed: "active",
  processing: "active",
  shipped: "active",
  // Deliberately ACTIVE: a return request is the seller's next action item,
  // not a finished order. Grouping it under Closed would bury exactly the
  // rows a seller most needs to see.
  return_requested: "active",
  delivered: "closed",
  cancelled: "closed",
  refunded: "closed",
  returned: "closed",
};

/**
 * The statuses a scope covers, or `undefined` for "all" (no filter).
 *
 * Emitted as a pipe-joined OR-group, which the Firebase Sieve adapter upgrades
 * to a single Firestore "in" query — no fan-out, and it reuses the existing
 * (status, createdAt) composite index.
 */
export function statusesForScope(scope: OrderScope): OrderStatus[] | undefined {
  if (scope === ORDER_SCOPE_VALUES.ALL) return undefined;
  return (Object.keys(STATUS_SCOPE) as OrderStatus[]).filter(
    (status) => STATUS_SCOPE[status] === scope,
  );
}

/**
 * Tab definitions for the scope bar.
 *
 * NOT registered in `audit-filter-tab-enums.mjs`'s REGISTRY, and deliberately
 * so — the same reasoning its header gives for `ADMIN_ORDER_PAYMENT_REVIEW_TABS`
 * and `ADMIN_CART_OWNERSHIP_TABS`. These ids are a DERIVED grouping, not values
 * any Firestore field holds, so there is no backing enum to compare them
 * against. `STATUS_SCOPE` above is what keeps them honest instead, at compile
 * time.
 */
export const ORDER_SCOPE_TABS: readonly { id: OrderScope; label: string }[] = [
  { id: ORDER_SCOPE_VALUES.ACTIVE, label: "Active" },
  { id: ORDER_SCOPE_VALUES.CLOSED, label: "Closed" },
  { id: ORDER_SCOPE_VALUES.ALL, label: "All" },
];

/**
 * Fold the lifecycle scope into a caller-supplied Sieve filter string.
 *
 * Shared by all three order list routes rather than written three times —
 * partly for the usual reason, but mostly because of the guard: if `filters`
 * already carries a `status==` clause, the scope must NOT add a second one.
 * Two equality clauses on one field are AND-ed by Sieve, and no document can
 * satisfy both, so the list would silently return zero rows (the failure mode
 * documented in Root Cause #59). An explicit status wins; the scope only fills
 * the gap when the caller named none.
 */
export function mergeOrderScopeFilter(
  filters: string | undefined | null,
  scopeParam: string | undefined | null,
): string | undefined {
  const existing = (filters ?? "").trim();
  if (!scopeParam || !isOrderScope(scopeParam)) return existing || undefined;
  if (/(^|,)\s*status\s*==/.test(existing)) return existing || undefined;

  const statuses = statusesForScope(scopeParam);
  if (!statuses?.length) return existing || undefined;

  // A pipe-joined OR-group on ONE field — the Firebase Sieve adapter upgrades
  // it to a single Firestore "in" query rather than several.
  const clause = `status==${statuses.join("|")}`;
  return existing ? `${existing},${clause}` : clause;
}

/** Re-exported for callers that need the raw values alongside the scope. */
export { OrderStatusValues };
