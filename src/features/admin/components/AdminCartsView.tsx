"use client";

import { type JsonArray, SIEVE_OP, sieveFilter } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { FilterChipGroup, ListingLayout, RecordDetailModal } from "../../../ui";
import type { ListingLayoutProps, RecordDetailItem } from "../../../ui";
import type { JsonValue } from "../../../schemas/types";
import { formatCurrency } from "../../../utils/number.formatter";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminCartsResponse {
  items?: JsonArray;
  total?: number;
}

interface CartRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw: Record<string, JsonValue>;
}

/**
 * The cart's `items[]` is already in the list response — mapRows only ever
 * read `.length` for the row subtitle and discarded the rest, leaving no way
 * to see what's actually in a cart (Root Cause #52). This maps it for the
 * detail modal.
 */
function toCartItemEntries(raw: Record<string, JsonValue>): RecordDetailItem[] {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return items
    .filter((e): e is Record<string, JsonValue> => Boolean(e) && typeof e === "object")
    .map((e) => {
      const qty = typeof e.quantity === "number" ? e.quantity : 1;
      const price = typeof e.price === "number" ? e.price : undefined;
      return {
        image: typeof e.image === "string" ? e.image : undefined,
        title: typeof e.title === "string" ? e.title : String(e.productId ?? "Item"),
        subtitle: `Qty: ${qty}`,
        trailing: price !== undefined ? formatCurrency(price * qty) : undefined,
      };
    });
}

const ADMIN_CARTS_CONFIG: ListingViewConfig<AdminCartsResponse, CartRow> = {
  portal: "admin",
  title: "Carts",
  searchPlaceholder: "Search by user ID or session",
  emptyLabel: "No carts found",
  filterKeys: ["ownership"],
  defaultSort: sortBy("updatedAt", "DESC"),
  queryKey: ["admin", "carts", "listing"],
  endpoint: ADMIN_ENDPOINTS.ADMIN_CARTS,
  sortOptions: [
    { value: sortBy("updatedAt", "DESC"), label: "Recently updated" },
    { value: sortBy("updatedAt", "ASC"), label: "Oldest" },
  ],
  mapRows: (response) =>
    toRecordArray(response.items).map((item, index) => {
      const isGuest = !item.userId;
      const itemCount = Array.isArray(item.items) ? (item.items as unknown[]).length : 0;
      const sessionShort = toStringValue(item.sessionId, "").slice(0, 8);
      return {
        id: toStringValue(item.id, `cart-${index}`),
        primary: isGuest
          ? `Guest · ${sessionShort || "—"}`
          : toStringValue(item.userId, `user-${index}`),
        secondary: `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
        status: isGuest ? "Guest" : "Authenticated",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      };
    }),
  getTotal: (response, mappedRows) =>
    typeof response.total === "number" ? response.total : mappedRows.length,
  buildFilters: (state) =>
    // Guest carts store userId as an empty string (CartDocument.userId is a
    // required string, not optional, see mapRows below). Only the guest-only
    // direction is offered: an authenticated-only filter would need a NEQ
    // on userId combined with the default updatedAt sort, which Firestore
    // rejects (inequality filters require orderBy to match the same
    // field), and CartRepository Sieve config marks userId as not
    // sortable, so no safe workaround sort exists.
    state.ownership === "guest" ? sieveFilter("userId", SIEVE_OP.EQ, "") : undefined,
  renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
    <FilterChipGroup
      label="Ownership"
      tabs={[
        { id: "", label: "All" },
        { id: "guest", label: "Guest only" },
      ]}
      value={pendingFilters.ownership ?? ""}
      onChange={(id) => setPendingFilters((p) => ({ ...p, ownership: id }))}
      allId=""
    />
  ),
};

export type AdminCartsViewProps = ListingLayoutProps;

export function AdminCartsView({ children, ...props }: AdminCartsViewProps) {
  const [selected, setSelected] = useState<CartRow | null>(null);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const raw = selected?._raw ?? {};
  const isGuest = !raw.userId;

  return (
    <>
      <DataListingView
        config={{ ...ADMIN_CARTS_CONFIG, onRowClick: (row) => setSelected(row) }}
      />
      <RecordDetailModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Cart Details"
        badges={[{ label: isGuest ? "Guest" : "Authenticated", variant: isGuest ? "default" : "info" }]}
        fields={[
          { label: isGuest ? "Session" : "User", value: String(raw.sessionId ?? raw.userId ?? "—") },
          { label: "Last updated", value: selected?.updatedAt ?? "—" },
          { label: "Cart ID", value: selected?.id ?? "—" },
        ]}
        items={{ heading: "Items in cart", entries: toCartItemEntries(raw) }}
      />
    </>
  );
}
