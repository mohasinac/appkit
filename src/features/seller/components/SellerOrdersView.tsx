"use client";

import React, { useState, useCallback } from "react";
import { X, Eye, Printer, MapPin } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { BulkActionBar, Badge, Button, Div, FilterChipGroup, Heading, Input, ListingToolbar, Pagination, ListingViewShell, Select, SideDrawer, Stack, Text } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps, SelectOption } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { PhysicalLocationModal } from "./PhysicalLocationModal";
import type { PhysicalLocation } from "./PhysicalLocationModal";
import { ROUTES } from "../../../constants";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];
const STATUS_OPTIONS = SELLER_ORDER_STATUS_TABS;

const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  DELIVERED: "success",
  SHIPPED: "info",
  PROCESSING: "warning",
  PENDING: "default",
  CANCELLED: "danger",
  REFUNDED: "danger",
};

const UPDATE_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "— keep current —" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  itemCount: number;
  totalAmount: number;
  buyerName: string;
  physicalLocation?: { zone: string; shelf: string; bin: string };
}

interface OrderDetail {
  id: string;
  status: string;
  totalAmount?: number;
  buyerName?: string;
  shippingAddress?: Record<string, unknown>;
  items?: Array<{ productId?: string; title?: string; quantity?: number; price?: number }>;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  paymentMethod?: string;
  createdAt?: unknown;
}

interface SellerOrdersResponse {
  orders?: unknown[];
  meta?: { total: number };
}

export interface SellerOrdersViewProps extends ListingViewShellProps {
  orderDetailApiBase?: string;
}

// ---------------------------------------------------------------------------
// Order Detail Drawer
// ---------------------------------------------------------------------------

function OrderDetailDrawer({
  orderId,
  apiBase,
  onClose,
}: {
  orderId: string;
  apiBase: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  React.useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`${apiBase}/${orderId}`)
      .then((r) => r.json())
      .then((json) => {
        const o = (json?.data ?? json) as OrderDetail;
        setOrder(o);
        setTrackingNumber(o.trackingNumber ?? "");
        setCarrier(o.carrier ?? "");
        setTrackingUrl(o.trackingUrl ?? "");
      })
      .catch(() => setFetchError("Failed to load order details"))
      .finally(() => setLoading(false));
  }, [orderId, apiBase]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (newStatus) payload.status = newStatus;
      if (trackingNumber !== (order.trackingNumber ?? "")) payload.trackingNumber = trackingNumber;
      if (carrier !== (order.carrier ?? "")) payload.shippingCarrier = carrier;
      if (trackingUrl !== (order.trackingUrl ?? "")) payload.trackingUrl = trackingUrl;

      if (Object.keys(payload).length === 0) { onClose(); return; }

      const res = await fetch(`${apiBase}/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error ?? "Failed to update order");
      }
      const updated = await res.json();
      setOrder((updated?.data ?? updated) as OrderDetail);
      setNewStatus("");
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addr = order?.shippingAddress ?? {};
  const addrLine = [addr.addressLine1, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");

  return (
    <SideDrawer isOpen title={`Order ${order?.id ?? orderId}`} onClose={onClose}>
      {loading && (
        <Div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--appkit-color-primary)] border-t-transparent" />
        </Div>
      )}

      {fetchError && (
        <Div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {fetchError}
        </Div>
      )}

      {order && !loading && (
        <Stack gap="none" className="flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Status row */}
            <Div className="flex items-center justify-between">
              <Badge variant={STATUS_BADGE_VARIANT[order.status?.toUpperCase()] ?? "default"}>
                {order.status ?? "Unknown"}
              </Badge>
              <Text size="sm" className="text-[var(--appkit-color-text-secondary)]">
                {toRelativeDate(order.createdAt)}
              </Text>
            </Div>

            {/* Items */}
            {(order.items ?? []).length > 0 && (
              <Div>
                <Text size="sm" className="font-semibold text-[var(--appkit-color-text-primary)] mb-2">Items</Text>
                <div className="divide-y divide-[var(--appkit-color-border)] dark:divide-slate-700 rounded-lg border border-[var(--appkit-color-border)] dark:border-slate-700">
                  {(order.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 gap-3">
                      <div className="min-w-0">
                        <Text size="sm" className="font-medium truncate">{item.title ?? item.productId ?? "Item"}</Text>
                        <Text size="xs" className="text-[var(--appkit-color-text-secondary)]">Qty: {item.quantity ?? 1}</Text>
                      </div>
                      <Text size="sm" className="shrink-0 font-medium">{toRupees(item.price ?? 0)}</Text>
                    </div>
                  ))}
                </div>
              </Div>
            )}

            {/* Total */}
            <Div className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-slate-800/60 px-4 py-3">
              <Text size="sm" className="font-semibold">Total</Text>
              <Text size="sm" className="font-bold text-[var(--appkit-color-primary)]">{toRupees(order.totalAmount ?? 0)}</Text>
            </Div>

            {/* Shipping address */}
            {addrLine && (
              <Div>
                <Text size="sm" className="font-semibold mb-1">Shipping address</Text>
                <Text size="sm" className="text-[var(--appkit-color-text-secondary)]">
                  {[String(addr.fullName ?? ""), addrLine].filter(Boolean).join(" · ")}
                </Text>
              </Div>
            )}

            {/* Payment */}
            {order.paymentMethod && (
              <Div>
                <Text size="sm" className="font-semibold mb-1">Payment</Text>
                <Text size="sm" className="text-[var(--appkit-color-text-secondary)] capitalize">{order.paymentMethod}</Text>
              </Div>
            )}

            {/* Update section */}
            <div className="border-t border-[var(--appkit-color-border)] dark:border-slate-700 pt-4 space-y-3">
              <Heading level={4} className="text-sm font-semibold">Update order</Heading>
              <Select label="New status" value={newStatus} options={UPDATE_STATUS_OPTIONS} onChange={(e) => setNewStatus(e.target.value)} />
              <Input label="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 12345678901234" />
              <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Delhivery, Bluedart" />
              <Input label="Tracking URL (optional)" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." type="url" />
              {saveError && (
                <Div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-3 py-2 text-xs text-red-700 dark:text-red-200">
                  {saveError}
                </Div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--appkit-color-border)] dark:border-slate-700 px-4 py-3.5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
            <Button onClick={handleSave} isLoading={saving} disabled={saving}>Save</Button>
          </div>
        </Stack>
      )}
    </SideDrawer>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function SellerOrdersView({
  orderDetailApiBase = SELLER_ENDPOINTS.ORDERS,
  children,
  ...props
}: SellerOrdersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [setLocationOpen, setSetLocationOpen] = useState(false);
  const dispatch = useActionDispatch();

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => { table.set("q", searchInput.trim()); }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const statusRaw = table.get("status");
  const filters = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerOrdersResponse,
    OrderRow
  >({
    queryKey: ["seller", "orders", "listing"],
    endpoint: SELLER_ENDPOINTS.ORDERS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => {
        const itemsArr = Array.isArray(item.items) ? (item.items as unknown[]) : [];
        const loc = item.physicalLocation as { zone?: string; shelf?: string; bin?: string } | undefined;
        return {
          id: toStringValue(item.id, `order-${index}`),
          primary: toStringValue(item.id, "Order"),
          secondary: toStringValue(item.buyerName ?? item.buyerDisplayName, "Unknown buyer"),
          status: toStringValue(item.status, "PENDING"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.orderDate ?? item.createdAt),
          itemCount: itemsArr.length,
          totalAmount: Number(item.totalAmount ?? item.total ?? 0),
          buyerName: toStringValue(item.buyerName ?? item.buyerDisplayName, "Unknown buyer"),
          physicalLocation:
            loc && typeof loc.zone === "string"
              ? { zone: loc.zone, shelf: loc.shelf ?? "", bin: loc.bin ?? "" }
              : undefined,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const columns: AdminTableColumn<OrderRow>[] = [
    {
      key: "primary",
      header: "Order",
      render: (row) => (
        <div className="space-y-0.5 min-w-0">
          <Text className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{row.primary}</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.buyerName} · {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}</Text>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      className: "w-28",
      render: (row) => <span className="text-sm font-semibold">{toRupees(row.totalAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "w-32",
      render: (row) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status?.toUpperCase()] ?? "default"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "physicalLocation",
      header: "Staging",
      className: "w-28",
      render: (row) =>
        row.physicalLocation ? (
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {row.physicalLocation.zone}/{row.physicalLocation.shelf}/{row.physicalLocation.bin}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
        ),
    },
    {
      key: "shipping",
      header: "Shipping",
      className: "w-32",
      render: (row) => {
        const r = row as unknown as { shippingMethod?: string; carrier?: string; trackingNumber?: string };
        return (
          <span className="text-xs text-zinc-600 dark:text-zinc-300">
            {r.shippingMethod ?? r.carrier ?? "—"}
          </span>
        );
      },
    },
    {
      key: "weight",
      header: "Weight",
      className: "w-20 text-right",
      render: (row) => {
        const r = row as unknown as { weightGrams?: number };
        return (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {r.weightGrams ? `${r.weightGrams} g` : "—"}
          </span>
        );
      },
    },
    {
      key: "updatedAt",
      header: "Date",
      className: "w-28",
      render: (row) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.updatedAt}</span>,
    },
  ];

  const renderRowActions = useCallback(
    (row: OrderRow) => (
      <button
        type="button"
        onClick={() => setSelectedOrderId(row.id)}
        title="View order details"
        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        <Eye className="h-4 w-4" />
      </button>
    ),
    [],
  );

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  const handlePrintPackingSlips = useCallback(() => {
    const ids = selection.selectedIds.join(",");
    void dispatch({
      type: "NAVIGATE",
      href: `${String(ROUTES.STORE.INVENTORY_PRINT)}?type=order&ids=${ids}&autoprint=1`,
    });
  }, [selection.selectedIds, dispatch]);

  const handleSetLocation = useCallback(async (loc: PhysicalLocation) => {
    await fetch(SELLER_ENDPOINTS.ORDERS_BULK_LOCATION, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: selection.selectedIds, physicalLocation: loc }),
    });
    setSetLocationOpen(false);
  }, [selection.selectedIds]);

  // S-STORE-5-A — bulk order selection → single payout request.
  const requestPayoutForSelection = useCallback(async () => {
    if (!selection.selectedIds.length) return;
    await fetch("/api/store/payouts/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: selection.selectedIds }),
    }).catch(() => null);
    selection.clearSelection();
  }, [selection]);

  const bulkActions: BulkActionItem[] = [
    {
      id: ACTIONS.STORE["print-packing-slips"].id,
      label: ACTIONS.STORE["print-packing-slips"].label,
      icon: <Printer className="w-4 h-4" />,
      onClick: handlePrintPackingSlips,
    },
    {
      id: ACTIONS.STORE["set-location"].id,
      label: ACTIONS.STORE["set-location"].label,
      icon: <MapPin className="w-4 h-4" />,
      onClick: () => setSetLocationOpen(true),
    },
    {
      id: ACTIONS.STORE["request-payout"].id,
      label: ACTIONS.STORE["request-payout"].label,
      onClick: () => void requestPayoutForSelection(),
      variant: "primary",
    },
  ];

  if (hasChildren) {
    return <ListingViewShell portal="seller" {...props}>{children}</ListingViewShell>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search by order ID or buyer name"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      {selection.selectedIds.length > 0 && (
        <div className="sticky top-[calc(var(--header-height,0px)+88px)] z-20 px-3 sm:px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700">
          <BulkActionBar
            selectedCount={selection.selectedIds.length}
            onClearSelection={selection.clearSelection}
            actions={bulkActions}
          />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {errorMessage}
          </Div>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          isLoading={isLoading}
          emptyLabel="No orders yet"
          selectedIds={selection.selectedIdSet}
          onToggleSelect={selection.toggle}
          onToggleSelectAll={() => selection.toggleAll()}
          renderRowActions={renderRowActions}
        />
      </div>

      {/* Filter sidebar */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 transition-colors">Clear all</button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <FilterChipGroup
                label="Status"
                tabs={STATUS_OPTIONS}
                value={pendingFilters.status ?? ""}
                onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
              />
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-[var(--appkit-color-primary)] py-2.5 text-sm font-semibold text-white transition-colors active:scale-[0.98]">
                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Order detail drawer */}
      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          apiBase={orderDetailApiBase}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {setLocationOpen && (
        <PhysicalLocationModal
          count={selection.selectedIds.length}
          onSave={handleSetLocation}
          onClose={() => setSetLocationOpen(false)}
        />
      )}
    </div>
  );
}
