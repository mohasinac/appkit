"use client";

import React, { useState, useCallback } from "react";
import { Eye, Printer, MapPin, Truck } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { BulkActionBar, Badge, Button, Div, FilterChipGroup, Heading, Input, ListingFilterDrawer, ListingToolbar, Pagination, ListingLayout, Select, SideDrawer, Stack, Text, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps, SelectOption } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
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
import { useBottomActions } from "../../layout";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

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
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
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

export interface SellerOrdersViewProps extends ListingLayoutProps {
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
          <Div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--appkit-color-primary)] border-t-transparent" />
        </Div>
      )}

      {fetchError && (
        <Div className="mx-4 mt-4 rounded-lg border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
          {fetchError}
        </Div>
      )}

      {order && !loading && (
        <Stack gap="none" className="flex flex-col">
          <Div className={`flex-1 ${__O.yAuto} px-4 py-4 space-y-5`}>
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
                <Div className="divide-y divide-[var(--appkit-color-border)] dark:divide-slate-700 rounded-lg border border-[var(--appkit-color-border)] dark:border-slate-700">
                  {(order.items ?? []).map((item, i) => (
                    <Div key={i} className="flex items-center justify-between px-3 py-2.5 gap-3">
                      <Div className="min-w-0">
                        <Text size="sm" className="font-medium truncate">{item.title ?? item.productId ?? "Item"}</Text>
                        <Text size="xs" className="text-[var(--appkit-color-text-secondary)]">Qty: {item.quantity ?? 1}</Text>
                      </Div>
                      <Text size="sm" className="shrink-0 font-medium">{toRupees(item.price ?? 0)}</Text>
                    </Div>
                  ))}
                </Div>
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
            <Div className="border-t border-[var(--appkit-color-border)] dark:border-slate-700 pt-4 space-y-3">
              <Heading level={4} className="text-sm font-semibold">Update order</Heading>
              <Select label="New status" value={newStatus} options={UPDATE_STATUS_OPTIONS} onChange={(e) => setNewStatus(e.target.value)} />
              <Input label="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 12345678901234" />
              <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Delhivery, Bluedart" />
              <Input label="Tracking URL (optional)" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." type="url" />
              {saveError && (
                <Div className="rounded-lg border border-error/20 bg-error-surface px-3 py-2 text-xs text-error">
                  {saveError}
                </Div>
              )}
            </Div>
          </Div>

          {/* Footer */}
          <Div className="border-t border-[var(--appkit-color-border)] dark:border-slate-700 px-4 py-3.5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
            <Button onClick={handleSave} isLoading={saving} disabled={saving}>Save</Button>
          </Div>
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
  const { showToast } = useToast();

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
        <Div className="space-y-0.5 min-w-0">
          <Text className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{row.primary}</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.buyerName} · {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}</Text>
        </Div>
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
          <span className="text-xs text-zinc-400 dark:text-zinc-400">—</span>
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

  const handleQuickShip = useCallback(async (row: OrderRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`${orderDetailApiBase}/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shipped" }),
    }).catch(() => null);
    if (res?.ok) setSelectedOrderId(null);
  }, [orderDetailApiBase]);

  const renderRowActions = useCallback(
    (row: OrderRow) => {
      const isShippable = ["PENDING", "PROCESSING", "CONFIRMED"].includes(row.status?.toUpperCase() ?? "");
      return (
        <Div className="flex items-center gap-1">
          {isShippable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => void handleQuickShip(row, e)}
              aria-label="Mark as shipped"
              title="Mark shipped"
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setSelectedOrderId(row.id); }}
            title="View order details"
            aria-label="View order details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </Div>
      );
    },
    [handleQuickShip],
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
    try {
      const res = await fetch(SELLER_ENDPOINTS.ORDERS_BULK_LOCATION, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selection.selectedIds, physicalLocation: loc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error ?? "Failed to update location");
      }
      showToast("Location updated.", "success");
      setSetLocationOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update location.", "error");
    }
  }, [selection.selectedIds, showToast]);

  // S-STORE-5-A — bulk order selection → single payout request.
  const requestPayoutForSelection = useCallback(async () => {
    if (!selection.selectedIds.length) return;
    try {
      const res = await fetch("/api/store/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selection.selectedIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error ?? "Failed to request payout");
      }
      showToast("Payout requested.", "success");
      selection.clearSelection();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to request payout.", "error");
    }
  }, [selection, showToast]);

  const bulkActions: BulkActionItem[] = [
    buildBulkAction(ACTIONS.STORE["print-packing-slips"], handlePrintPackingSlips, { icon: <Printer className="w-4 h-4" /> }),
    buildBulkAction(ACTIONS.STORE["set-location"], () => setSetLocationOpen(true), { icon: <MapPin className="w-4 h-4" /> }),
    buildBulkAction(ACTIONS.STORE["request-payout"], () => void requestPayoutForSelection(), { variant: "primary" }),
  ];

  if (hasChildren) {
    return <ListingLayout portal="seller" {...props}>{children}</ListingLayout>;
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <Div className="min-h-screen">
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
        <Div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Div>
      )}

      {selection.selectedIds.length > 0 && (
        <Div className="sticky top-[calc(var(--header-height,0px)+88px)] z-20 px-3 sm:px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700">
          <BulkActionBar
            selectedCount={selection.selectedIds.length}
            onClearSelection={selection.clearSelection}
            actions={bulkActions}
          />
        </Div>
      )}

      <Div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
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
      </Div>

      {/* Filter sidebar */}
      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
          label="Status"
          tabs={STATUS_OPTIONS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
      </ListingFilterDrawer>

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
    </Div>
  );
}
