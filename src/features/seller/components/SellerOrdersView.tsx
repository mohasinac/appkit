"use client";
import { normalizeError } from "../../../errors/normalize";

import { Row, SIEVE_OP, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { Eye, Printer, MapPin, Truck } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { BulkActionBar, Badge, Button, Div, FilterChipGroup, Heading, Input, ListingFilterDrawer, ListingToolbar, Pagination, ListingLayout, Select, SideDrawer, Span, Stack, Text, useToast } from "../../../ui";
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
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
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
      void normalizeError(err);
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
        <Row align="center" justify="center" padding="y-4xl">
          <Div className="h-6 w-6 animate-spin border-2 border-[var(--appkit-color-primary)] border-t-transparent" rounded="full" />
        </Row>
      )}

      {fetchError && (
        <Div className="mx-4 mt-4 border border-error/20 text-sm" color="error" surface="danger-surface" padding="inline" rounded="lg">
          {fetchError}
        </Div>
      )}

      {order && !loading && (
        <Stack gap="none" className="flex flex-col">
          <Stack className={`flex-1 ${__O.yAuto}`} gap="5" padding="md">
            {/* Status row */}
            <Row align="center" justify="between">
              <Badge variant={STATUS_BADGE_VARIANT[order.status?.toUpperCase()] ?? "default"}>
                {order.status ?? "Unknown"}
              </Badge>
              <Text size="sm" className="text-[var(--appkit-color-text-secondary)]">
                {toRelativeDate(order.createdAt)}
              </Text>
            </Row>

            {/* Items */}
            {(order.items ?? []).length > 0 && (
              <Div>
                <Text size="sm" className="text-[var(--appkit-color-text-primary)] mb-2" weight="semibold">Items</Text>
                <Div className="divide-y divide-[var(--appkit-color-border)] dark:divide-slate-700 border border-[var(--appkit-color-border)]" rounded="lg">
                  {(order.items ?? []).map((item, i) => (
                    <Row key={i} className="py-2.5" padding="x-sm" align="center" justify="between" gap="3">
                      <Div className="min-w-0">
                        <Text size="sm" className="truncate" weight="medium">{item.title ?? item.productId ?? "Item"}</Text>
                        <Text size="xs" className="text-[var(--appkit-color-text-secondary)]">Qty: {item.quantity ?? 1}</Text>
                      </Div>
                      <Text size="sm" className="shrink-0" weight="medium">{toRupees(item.price ?? 0)}</Text>
                    </Row>
                  ))}
                </Div>
              </Div>
            )}

            {/* Total */}
            <Row surface="muted" padding="inline" align="center" justify="between" rounded="lg">
              <Text size="sm" weight="semibold">Total</Text>
              <Text size="sm" className="text-[var(--appkit-color-primary)]" weight="bold">{toRupees(order.totalAmount ?? 0)}</Text>
            </Row>

            {/* Shipping address */}
            {addrLine && (
              <Div>
                <Text size="sm" className="mb-1" weight="semibold">Shipping address</Text>
                <Text size="sm" className="text-[var(--appkit-color-text-secondary)]">
                  {[String(addr.fullName ?? ""), addrLine].filter(Boolean).join(" · ")}
                </Text>
              </Div>
            )}

            {/* Payment */}
            {order.paymentMethod && (
              <Div>
                <Text size="sm" className="mb-1" weight="semibold">Payment</Text>
                <Text size="sm" className="text-[var(--appkit-color-text-secondary)]" transform="capitalize">{order.paymentMethod}</Text>
              </Div>
            )}

            {/* Update section */}
            <Stack className="border-t border-[var(--appkit-color-border)]" padding="t-md" gap="3">
              <Heading level={4} size="sm" weight="semibold">Update order</Heading>
              <Select label="New status" value={newStatus} options={UPDATE_STATUS_OPTIONS} onChange={(e) => setNewStatus(e.target.value)} />
              <Input label="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 12345678901234" />
              <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Delhivery, Bluedart" />
              <Input label="Tracking URL (optional)" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." type="url" />
              {saveError && (
                <Div className="border border-error/20 text-xs" color="error" surface="danger-surface" padding="inlineSm" rounded="lg">
                  {saveError}
                </Div>
              )}
            </Stack>
          </Stack>

          {/* Footer */}
          <Row className="border-t border-[var(--appkit-color-border)] py-3.5" padding="x-md" align="center" justify="end" gap="3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
            <Button onClick={handleSave} isLoading={saving} disabled={saving}>Save</Button>
          </Row>
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
  const filters = statusRaw && statusRaw !== "All" ? sieveFilter("status", SIEVE_OP.EQ, statusRaw) : undefined;

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
          <Text className="font-mono truncate" color="primary" size="xs" weight="semibold">{row.primary}</Text>
          <Text size="xs" color="muted">{row.buyerName} · {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}</Text>
        </Div>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      className: "w-28",
      render: (row) => <Span size="sm" weight="semibold">{toRupees(row.totalAmount)}</Span>,
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
          <Span size="xs" className="font-mono" color="muted">
            {row.physicalLocation.zone}/{row.physicalLocation.shelf}/{row.physicalLocation.bin}
          </Span>
        ) : (
          <Span size="xs" color="muted">—</Span>
        ),
    },
    {
      key: "shipping",
      header: "Shipping",
      className: "w-32",
      render: (row) => {
        const r = row as unknown as { shippingMethod?: string; carrier?: string; trackingNumber?: string };
        return (
          <Span size="xs" color="muted">
            {r.shippingMethod ?? r.carrier ?? "—"}
          </Span>
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
          <Span size="xs" className="tabular-nums" color="muted">
            {r.weightGrams ? `${r.weightGrams} g` : "—"}
          </Span>
        );
      },
    },
    {
      key: "updatedAt",
      header: "Date",
      className: "w-28",
      render: (row) => <Span size="xs" color="muted">{row.updatedAt}</Span>,
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
        <Row align="center" gap="xs">
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
        </Row>
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
      void normalizeError(err);
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
      void normalizeError(err);
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
        <Row border="bottom" className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 backdrop-blur-sm" surface="default" padding="toolbar" justify="center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </Row>
      )}

      {selection.selectedIds.length > 0 && (
        <Div border="default" className="sticky top-[calc(var(--header-height,0px)+88px)] z-20 px-3 sm:px-4 backdrop-blur-sm border-b" surface="default" padding="y-xs">
          <BulkActionBar
            selectedCount={selection.selectedIds.length}
            onClearSelection={selection.clearSelection}
            actions={bulkActions}
          />
        </Div>
      )}

      <Div className="px-3 sm:px-4" padding="y-md">
        {errorMessage && (
          <Div className="mb-4 border border-error/20 text-sm" color="error" surface="danger-surface" padding="inline" rounded="xl">
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
