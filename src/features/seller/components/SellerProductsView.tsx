"use client";

import React, { useState, useCallback } from "react";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { Eye, EyeOff, Pencil, Trash2, Printer, MapPin } from "lucide-react";
import { PhysicalLocationModal } from "./PhysicalLocationModal";
import type { PhysicalLocation } from "./PhysicalLocationModal";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { Alert, Badge, BulkActionBar, Button, Div, ListingToolbar, ListingViewShell, Pagination, Row, Span, Text, useToast } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRODUCT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ROUTES } from "../../../constants";
import { normalizeListingType } from "../../products/utils/listing-type";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useSellerListingData,
} from "../hooks/useSellerListingData";
import { DataTable } from "../../admin/components/DataTable";
import type { AdminTableColumn } from "../../admin/types";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

import { SellerProductsCards } from "./SellerProductsCards";
import { SellerProductsFilterDrawer } from "./SellerProductsFilterDrawer";
import { KIND_BADGE_VARIANT } from "./seller-products-styles";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;

const FILTER_KEYS = [
  "status",
  "category",
  "brand",
  "condition",
  "minPrice",
  "maxPrice",
  "tags",
  "badges",
];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "-price", label: "Price High" },
  { value: "price", label: "Price Low" },
];
const STATUS_OPTIONS = SELLER_PRODUCT_STATUS_TABS;

type ListingKind = "all" | "standard" | "auction" | "pre-order" | "prize-draw" | "bundle" | "classified" | "digital-code" | "live";

interface ProductRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  imageUrl?: string;
  listingKind: ListingKind;
  price: string;
  physicalLocation?: { zone: string; shelf: string; bin: string };
}

interface SellerProductsResponse {
  products?: unknown[];
  meta?: { total: number; totalPages?: number };
}

export interface SellerProductsViewProps extends ListingViewShellProps {
  onDeleteProduct?: (id: string) => Promise<void>;
  /** S-STORE-2-E — "New Listing" toolbar button. */
  onCreateClick?: () => void;
}

// S-STORE-2-A — `<TypeDropdown>` replaces the legacy chip strip. Same width on
// mobile, narrower on desktop. Drives the `?listingType=` query param.
function TypeDropdown({
  active,
  onChange,
}: {
  active: ListingKind;
  onChange: (kind: ListingKind) => void;
}) {
  const options: { value: ListingKind; label: string }[] = [
    { value: "all", label: "All listings" },
    { value: "standard", label: "Standard" },
    { value: "auction", label: "Auction" },
    { value: "pre-order", label: "Pre-order" },
    { value: "prize-draw", label: "Prize Draw" },
    { value: "bundle", label: "Bundle" },
    { value: "classified", label: "Classified" },
    { value: "digital-code", label: "Digital Code" },
    { value: "live", label: "Live" },
  ];
  return (
    <Row className="gap-2 px-3 lg:px-4 py-2 items-center border-b border-[var(--appkit-color-border)]">
      <Text className="text-xs font-semibold uppercase tracking-wide text-[var(--appkit-color-text-muted)]">
        Listing type
      </Text>
      <select
        value={active}
        onChange={(e) => onChange(e.target.value as ListingKind)}
        className="rounded border border-[var(--appkit-color-border)] bg-transparent px-2 py-1 text-sm sm:max-w-xs"
        aria-label="Filter by listing type"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  );
}


const PRODUCT_COLUMNS: AdminTableColumn<ProductRow>[] = [
  {
    key: "thumbnail",
    header: "",
    className: "w-12",
    render: (row) =>
      row.imageUrl ? (
        <img
          src={row.imageUrl}
          alt=""
          className="w-10 h-10 rounded-lg object-cover border border-[var(--appkit-color-border)]"
        />
      ) : (
        <Div className="w-10 h-10 rounded-lg bg-[var(--appkit-color-surface-raised)] border border-[var(--appkit-color-border)] flex items-center justify-center">
          <Span className="text-xs text-[var(--appkit-color-text-faint)]">–</Span>
        </Div>
      ),
  },
  {
    key: "primary",
    header: "Product",
    render: (row) => (
      <Div className="space-y-1">
        <Text className="font-medium text-[var(--appkit-color-text)] line-clamp-1">{row.primary}</Text>
        <Row className="gap-2">
          <Badge variant={KIND_BADGE_VARIANT[row.listingKind] ?? "default"}>
            {row.listingKind}
          </Badge>
          <Span className="text-xs text-[var(--appkit-color-text-muted)]">{row.secondary}</Span>
        </Row>
      </Div>
    ),
  },
  {
    key: "price",
    header: "Price",
    className: "w-28 text-right",
    render: (row) => (
      <Span className="text-sm font-medium text-[var(--appkit-color-text)]">{row.price}</Span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => {
      const variant =
        row.status === "active"
          ? "success"
          : row.status === "draft"
            ? "default"
            : row.status === "sold"
              ? "secondary"
              : "danger";
      return (
        <Badge variant={variant}>
          {row.status}
        </Badge>
      );
    },
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-28",
    render: (row) => (
      <Span className="text-xs text-[var(--appkit-color-text-muted)]">{row.updatedAt}</Span>
    ),
  },
  {
    key: "physicalLocation",
    header: "Location",
    className: "w-28",
    render: (row) =>
      row.physicalLocation ? (
        <Span className="text-xs font-mono text-[var(--appkit-color-text-muted)]">
          {row.physicalLocation.zone}/{row.physicalLocation.shelf}/{row.physicalLocation.bin}
        </Span>
      ) : (
        <Span className="text-xs text-[var(--appkit-color-text-faint)]">—</Span>
      ),
  },
];

export function SellerProductsView({
  onDeleteProduct,
  onCreateClick,
  children,
  ...props
}: SellerProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const dispatch = useActionDispatch();
  const { showToast } = useToast();

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  // listingKind is URL-driven so it survives navigation and back/forward
  const listingKind = ((table.get("listingType") as ListingKind) || "all") as ListingKind;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, string>>(new Map());
  const [setLocationOpen, setSetLocationOpen] = useState(false);

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
    const updates: Record<string, string> = { q: "", sort: "", listingType: "", showSold: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const handleKindChange = useCallback(
    (kind: ListingKind) => {
      // setMany prevents the double router.replace race condition (audit-double-navigation)
      table.setMany({ listingType: kind === "all" ? "" : kind, page: "1" });
    },
    [table],
  );

  const showSold = table.get("showSold") === "true";
  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== DEFAULT_SORT ||
    activeFilterCount > 0 ||
    listingKind !== "all" ||
    showSold;

  const statusRaw = table.get("status");
  const statusFilter = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
  // SB1-G — single-field listingType clause. The repository's Sieve aliases
  // accept both `==auction|preorder|standard` and `==pre-order` directly.
  const kindFilter = listingKind === "all" ? undefined : `listingType==${listingKind}`;
  const soldFilter = showSold ? undefined : "isSold==false";

  const filters = [statusFilter, kindFilter, soldFilter].filter(Boolean).join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useSellerListingData<
    SellerProductsResponse,
    ProductRow
  >({
    queryKey: ["seller", "products", "listing", listingKind],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.products).map((item, index) => {
        // SB1-G — derive kind from canonical listingType with legacy fallback.
        const lt = normalizeListingType(
          item as { listingType?: import("../../products/types").ListingType },
        );
        const kind: ListingKind =
          lt === "auction"
            ? "auction"
            : lt === "pre-order"
              ? "pre-order"
              : lt === "prize-draw"
                ? "prize-draw"
                : "standard";
        const priceRaw = typeof item.price === "number" ? item.price : 0;
        return {
          id: toStringValue(item.id, `product-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled product"),
          secondary: toStringValue(item.condition, ""),
          status: toStringValue(item.status, "draft"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          imageUrl: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
          listingKind: kind,
          price: priceRaw ? `₹${(priceRaw / 100).toLocaleString("en-IN")}` : "—",
          physicalLocation:
            item.physicalLocation &&
            typeof (item.physicalLocation as Record<string, unknown>).zone === "string"
              ? (item.physicalLocation as { zone: string; shelf: string; bin: string })
              : undefined,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const visibleRows = rows
    .filter((r) => !deletedIds.has(r.id))
    .map((r) => statusOverrides.has(r.id) ? { ...r, status: statusOverrides.get(r.id)! } : r);
  const selection = useBulkSelection<ProductRow>({ items: visibleRows, keyExtractor: (r) => r.id });

  if (hasChildren) {
    return (
      <ListingViewShell portal="seller" {...props}>
        {children}
      </ListingViewShell>
    );
  }

  const handleEdit = (row: ProductRow) => {
    const href =
      row.listingKind === "auction"
        ? String(ROUTES.STORE.AUCTIONS_EDIT(row.id))
        : row.listingKind === "pre-order"
          ? String(ROUTES.STORE.PRE_ORDERS_EDIT(row.id))
          : row.listingKind === "prize-draw"
            ? String(ROUTES.STORE.PRIZE_DRAWS_EDIT(row.id))
            : String(ROUTES.STORE.PRODUCTS_EDIT(row.id));
    void dispatch({ type: "NAVIGATE", href });
  };

  const handleDelete = async (row: ProductRow) => {
    if (!onDeleteProduct) return;
    setDeletingId(row.id);
    try {
      await onDeleteProduct(row.id);
      // Optimistically remove from list — avoids a full refetch
      setDeletedIds((prev) => new Set([...prev, row.id]));
    } finally {
      setDeletingId(null);
    }
  };

  // S-STORE-2-C — Duplicate verb. Server-side endpoint is /api/store/products/[id]/duplicate.
  const handleDuplicate = async (row: ProductRow) => {
    const res = await fetch(`/api/store/products/${row.id}/duplicate`, {
      method: "POST",
    }).catch(() => null);
    if (res && res.ok) {
      const json = await res.json().catch(() => null);
      const newId: string | undefined = json?.data?.id;
      if (newId) handleEdit({ ...row, id: newId });
    }
  };

  const handleTogglePublish = async (row: ProductRow) => {
    const currentStatus = statusOverrides.get(row.id) ?? row.status;
    const newStatus = currentStatus === "published" ? "draft" : "published";
    setPublishingId(row.id);
    try {
      const res = await fetch(`/api/store/products/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => null);
      if (res?.ok) {
        setStatusOverrides((prev) => new Map([...prev, [row.id, newStatus]]));
      }
    } finally {
      setPublishingId(null);
    }
  };

  const handleBulkPrintLabels = useCallback(() => {
    const ids = selection.selectedIds.join(",");
    void dispatch({
      type: "NAVIGATE",
      href: `${String(ROUTES.STORE.INVENTORY_PRINT)}?type=product&ids=${ids}&autoprint=1`,
    });
  }, [selection.selectedIds, dispatch]);

  const handleSetLocation = useCallback(async (loc: PhysicalLocation) => {
    try {
      const res = await fetch(SELLER_ENDPOINTS.PRODUCTS_BULK_LOCATION, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selection.selectedIds, physicalLocation: loc }),
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

  const bulkActions: BulkActionItem[] = [
    {
      id: ACTIONS.STORE["print-labels"].id,
      label: ACTIONS.STORE["print-labels"].label,
      icon: <Printer className="w-4 h-4" />,
      onClick: handleBulkPrintLabels,
    },
    {
      id: ACTIONS.STORE["set-location"].id,
      label: ACTIONS.STORE["set-location"].label,
      icon: <MapPin className="w-4 h-4" />,
      onClick: () => setSetLocationOpen(true),
    },
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  return (
    <>
      <Div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search products by name…"
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
          toggles={[
            { label: "Show sold", active: showSold, onChange: (next) => table.set("showSold", next ? "true" : "") },
          ]}
          extra={
            onCreateClick ? (
              <Button variant="primary" size="sm" onClick={onCreateClick}>
                + New Listing
              </Button>
            ) : null
          }
        />

        <TypeDropdown active={listingKind} onChange={handleKindChange} />

        {totalPages > 1 && (
          <Div
            className="sticky z-10 flex justify-center bg-[var(--appkit-color-surface)]/95 backdrop-blur-sm border-b border-[var(--appkit-color-border)] px-3 py-1.5"
            style={{ top: "calc(var(--header-height, 0px) + 44px)" }}
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </Div>
        )}

        {selection.selectedIds.length > 0 && (
          <Div className="sticky z-20 px-3 lg:px-4 py-2 bg-[var(--appkit-color-surface)]/95 backdrop-blur-sm border-b border-[var(--appkit-color-border)]"
            style={{ top: "calc(var(--header-height, 0px) + 88px)" }}>
            <BulkActionBar
              selectedCount={selection.selectedIds.length}
              onClearSelection={selection.clearSelection}
              actions={bulkActions}
            />
          </Div>
        )}

        <Div className="py-4 px-3 lg:px-4">
          {errorMessage && (
            <Alert variant="error" className="mb-4">{errorMessage}</Alert>
          )}
          {/* S-STORE — grid + list card views (table is the default). */}
          {view !== "table" && (
            <SellerProductsCards
              view={view}
              rows={visibleRows}
              isLoading={isLoading}
              listingKind={listingKind}
              selectedIds={selection.selectedIdSet}
              toggle={selection.toggle}
              onEdit={handleEdit}
              onDuplicate={(row) => void handleDuplicate(row)}
              onDelete={onDeleteProduct ? (row) => void handleDelete(row) : undefined}
            />
          )}
          {view === "table" && (
          <DataTable
            columns={PRODUCT_COLUMNS}
            rows={visibleRows}
            isLoading={isLoading}
            emptyLabel={
              listingKind !== "all"
                ? `No ${listingKind} listings found`
                : "No products listed yet"
            }
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={() => selection.toggleAll()}
            getRowHref={(row) =>
              // S-STORE-2-D — row click → public detail/preview, not edit.
              row.listingKind === "auction"
                ? `/auctions/${row.id}`
                : row.listingKind === "pre-order"
                  ? `/pre-orders/${row.id}`
                  : `/products/${row.id}`
            }
            renderRowActions={(row) => {
              const isPublished = (statusOverrides.get(row.id) ?? row.status) === "published";
  return (
                <Row className="gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                    aria-label={ACTIONS.STORE["edit-listing"].ariaLabel}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); void handleTogglePublish(row); }}
                    aria-label={isPublished ? "Unpublish" : "Publish"}
                    title={isPublished ? "Unpublish" : "Publish"}
                    disabled={publishingId === row.id}
                  >
                    {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); void handleDuplicate(row); }}
                    aria-label="Duplicate listing"
                    title="Duplicate"
                  >
                    ⧉
                  </Button>
                  {onDeleteProduct && (
                    <Button
                      variant="ghost"
                      size="sm"
                      action={ACTIONS.STORE["delete-listing"]}
                      onClick={(e) => { e.stopPropagation(); void handleDelete(row); }}
                      disabled={deletingId === row.id}
                      className="text-[var(--appkit-color-error)] hover:bg-[var(--appkit-color-border-subtle)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </Row>
              );
            }}
          />
          )}
        </Div>

        <SellerProductsFilterDrawer
          isOpen={filterOpen}
          pendingFilters={pendingFilters}
          statusOptions={STATUS_OPTIONS}
          activeFilterCount={activeFilterCount}
          onChange={setPendingFilters}
          onClear={clearFilters}
          onApply={applyFilters}
          onClose={() => setFilterOpen(false)}
        />
      </Div>

      {setLocationOpen && (
        <PhysicalLocationModal
          count={selection.selectedIds.length}
          onSave={handleSetLocation}
          onClose={() => setSetLocationOpen(false)}
        />
      )}
    </>
  );
}
