"use client";
/*
 * WHY: The ledger is the only thing that can answer "where did this go", and
 *      an append-only log is useless if nobody can read it.
 * WHAT: The movement listing. READ ONLY — there is no row action, because a
 *       movement cannot be edited or deleted.
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag access:client
 */

import React from "react";
import {
  DataListingView,
  type ListingViewConfig,
} from "../../admin/components/DataListingView";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { sortBy } from "../../../constants/sort";
import { statusLabel } from "../../../ui/columns/cell-renderers";
import {
  MovementKindValues,
  type InventoryMovementDocument,
} from "../schemas/firestore";

interface MovementRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

interface MovementsResponse {
  items?: InventoryMovementDocument[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/**
 * `AC60-01 → AC60-04`, or `→ AC60-04` for a receive.
 *
 * 🛑 Reads the DENORMALISED codes on the row, not the live box documents, and
 * that is correct rather than lazy: a movement records what things were
 * CALLED at the time. Resolving the current code would rewrite history to
 * match the present, which is the one thing a historical record must not do.
 */
function endpoints(m: InventoryMovementDocument): string {
  const from = m.fromBoxCode ?? m.fromBoxId;
  const to = m.toBoxCode ?? m.toBoxId;
  if (from && to) return `${from} → ${to}`;
  if (to) return `→ ${to}`;
  if (from) return `${from} →`;
  return "—";
}

export function AdminMoveLedgerView() {
  const config: ListingViewConfig<MovementsResponse, MovementRow> =
    React.useMemo(
      () => ({
        portal: "admin",
        title: "Move Ledger",
        subtitle:
          "Every stock movement, newest first. Append-only — a movement that should not have happened is corrected with an adjustment, never edited.",
        /*
         * 🛑 NO SEARCH BOX. `inventoryMovements` has no `searchTxt` and the
         * repository indexes equality-plus-date, so a box here would accept
         * typing, send the term and change nothing — which is the ~39 dead
         * boxes `DataListingView`'s own `searchPlaceholder` note is about.
         * Scoping is done by the kind chips and by arriving from a box or a
         * product page, both of which pass a real filter.
         */
        emptyLabel: "No stock has moved yet",
        filterKeys: ["kind"],
        defaultSort: sortBy("occurredAt", "DESC"),
        sortOptions: [
          { value: sortBy("occurredAt", "DESC"), label: "Newest" },
          { value: sortBy("occurredAt", "ASC"), label: "Oldest" },
          { value: sortBy("quantity", "DESC"), label: "Largest quantity" },
        ],
        queryKey: ["admin", "inventory", "movements"],
        endpoint: ADMIN_ENDPOINTS.INVENTORY_MOVEMENTS,
        mapRows: (response) =>
          (response.items ?? []).map((m) => ({
            id: m.id,
            primary: `${m.quantity} × ${m.productTitle ?? m.productId}`,
            secondary: [
              endpoints(m),
              /*
               * The reason, which is REQUIRED on an adjust — a variance
               * nobody explained is indistinguishable from a typo three
               * weeks later, and the row cannot be amended to add one.
               */
              m.reason,
              m.shipmentId ? `shipment ${m.shipmentId}` : undefined,
            ]
              .filter(Boolean)
              .join(" · "),
            status: statusLabel(m.kind),
            updatedAt: m.occurredAt ? String(m.occurredAt) : "",
          })),
        /*
         * 🛑 No `renderRowActions`, no `renderEditor`, no `rowHrefTemplate` —
         * so `DataListingView` gives these rows NO edit affordance, which is
         * the honest output for a collection whose repository throws on
         * `update` and `delete`. A pencil here would be a control that cannot
         * work, which is the defect the row-affordance work exists to remove
         * rather than to spread.
         */
      }),
      [],
    );

  return <DataListingView config={config} />;
}

/** The kind chips, derived from the union so a sixth kind cannot be missed. */
export const MOVEMENT_KIND_TABS = MovementKindValues.map((k) => ({
  id: k,
  label: statusLabel(k),
}));
