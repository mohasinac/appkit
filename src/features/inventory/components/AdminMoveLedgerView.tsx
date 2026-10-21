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
import { sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { RecordDetailModal } from "../../../ui/components/RecordDetailModal";
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
  /*
   * 🛑 The whole document rides along, because the ROW cannot show all of it.
   * `InventoryMovementDocument` declares 12 fields and the row renders 11 —
   * the one it drops is `actorUid`, i.e. WHO moved the stock, which is the
   * question an append-only ledger exists to answer. Keeping the document
   * here costs nothing (it is already in the response — `listForAdmin`
   * applies no projection) and is what lets the detail modal answer it.
   */
  doc: InventoryMovementDocument;
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
  /*
   * 🛑 Declared BEFORE the `useMemo` that closes over `setSelected`. The memo
   * factory runs during this render, so a `useState` below it would leave the
   * setter in its temporal dead zone and throw `ReferenceError` on first
   * paint — a `const` is hoisted but not initialised.
   */
  const [selected, setSelected] = React.useState<MovementRow | null>(null);

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
        /*
         * 🛑 REQUIRED, and its absence was not a missing filter — it CRASHED
         * THE PAGE. `useAdminListing` calls `buildFilters(currentFilterState)`
         * unconditionally (its optional sibling one line below is spelled
         * `buildExtraParams?.(…)`), so with none supplied the render threw
         * `TypeError: buildFilters is not a function` and
         * `/admin/inventory/movements` never painted at all.
         *
         * This view and `AdminStorageBoxesView` were the only two of ~84
         * `ListingViewConfig` declarations in the repo missing it — both mine,
         * both from Phase 5, and both among the four screens flagged as
         * "built without a browser". Opening either one once would have found
         * this instantly; reading the source did not, because the field is
         * required by a type that was only checked after a separate syntax
         * error stopped masking it.
         */
        buildFilters: (state) =>
          state.kind ? sieveFilter("kind", SIEVE_OP.EQ, state.kind) : undefined,
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
            doc: m,
          })),
        /*
         * 🛑 Still no `renderRowActions`, no `renderEditor`, no
         * `rowHrefTemplate` — so these rows get NO EDIT affordance, which is
         * the honest output for a collection whose repository throws on
         * `update` and `delete`. A pencil here would be a control that cannot
         * work, which is the defect the row-affordance work exists to remove
         * rather than to spread.
         *
         * 🛑 But READ is a different question, and the original version of
         * this comment answered the edit one and stopped — which is why
         * `audit-listing-detail-affordance` flagged this view as 1 of 64
         * dead ends and was RIGHT to. `onRowClick` opens a read-only modal;
         * it mutates nothing and so does not contradict any of the above.
         */
        onRowClick: (row) => setSelected(row),
      }),
      [],
    );

  const m = selected?.doc;

  return (
    <>
      <DataListingView config={config} />
      <RecordDetailModal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.primary ?? "Movement"}
        description={
          m
            ? `${statusLabel(m.kind)} · ${endpoints(m)}`
            : undefined
        }
        fields={
          m
            ? [
                /*
                 * `actorUid` first — it is the field the row cannot show and
                 * the only reason this modal exists. A uid rather than a
                 * name on purpose: resolving it would cost a user read per
                 * row, and the ledger's job is to be unambiguous about WHICH
                 * account acted, which a uid is and a display name is not.
                 */
                { label: "Moved by", value: m.actorUid || "—" },
                { label: "Kind", value: statusLabel(m.kind) },
                { label: "Quantity", value: String(m.quantity) },
                {
                  label: "Product",
                  value: m.productTitle ?? m.productId,
                },
                { label: "From", value: m.fromBoxCode ?? m.fromBoxId ?? "—" },
                { label: "To", value: m.toBoxCode ?? m.toBoxId ?? "—" },
                {
                  label: "Occurred",
                  value: m.occurredAt ? String(m.occurredAt) : "—",
                },
                { label: "Reason", value: m.reason || "—" },
                { label: "Shipment", value: m.shipmentId || "—" },
                { label: "Movement id", value: m.id },
              ]
            : undefined
        }
      />
    </>
  );
}

/** The kind chips, derived from the union so a sixth kind cannot be missed. */
export const MOVEMENT_KIND_TABS = MovementKindValues.map((k) => ({
  id: k,
  label: statusLabel(k),
}));
