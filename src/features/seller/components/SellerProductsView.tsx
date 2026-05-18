"use client";

import React, { useState, useCallback } from "react";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { X, Pencil, Trash2, Printer, MapPin } from "lucide-react";
import { PhysicalLocationModal } from "./PhysicalLocationModal";
import type { PhysicalLocation } from "./PhysicalLocationModal";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { Alert, Badge, BulkActionBar, Button, Div, FilterChipGroup, ListingToolbar, ListingViewShell, Pagination, Row, Span, Text } from "../../../ui";
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
import {
  INPUT_CLS,
  FILTER_LABEL_CLS,
  KIND_BADGE_VARIANT,
} from "./seller-products-styles";

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

// Kept for backward-compat callers; thin wrapper around TypeDropdown.
function TypeChips({
  active,
  onChange,
}: {
  active: ListingKind;
  onChange: (kind: ListingKind) => void;
}) {
  const chips: { kind: ListingKind; label: string }[] = [
    { kind: "all", label: "All" },
    { kind: "standard", label: "Standard" },
    { kind: "auction", label: "Auction" },
    { kind: "pre-order", label: "Pre-order" },
    { kind: "prize-draw", label: "Prize Draw" },
    { kind: "bundle", label: "Bundle" },
    { kind: "classified", label: "Classified" },
    { kind: "digital-code", label: "Digital Code" },
    { kind: "live", label: "Live" },
  ];
  return (
    <Row className="gap-2 px-3 lg:px-4 py-2 overflow-x-auto border-b border-[var(--appkit-color-border)]">
      {chips.map(({ kind, label }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={[
            "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
            active === kind
              ? "bg-[var(--appkit-color-primary)] text-white border-[var(--appkit-color-primary)]"
              : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:border-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary)]",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
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

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [listingKind, setListingKind] = useState<ListingKind>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    const updates: Record<string, string> = { q: "", sort: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
    setListingKind("all");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const handleKindChange = useCallback(
    (kind: ListingKind) => {
      setListingKind(kind);
      table.set("page", "1");
    },
    [table],
  );

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState =
    !!table.get("q") ||
    table.get("sort") !== DEFAULT_SORT ||
    activeFilterCount > 0 ||
    listingKind !== "all";

  const statusRaw = table.get("status");
  const statusFilter = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
  // SB1-G — single-field listingType clause. The repository's Sieve aliases
  // accept both `==auction|preorder|standard` and `==pre-order` directly.
  const kindFilter =
    listingKind === "auction"
      ? "listingType==auction"
      : listingKind === "pre-order"
        ? "listingType==pre-order"
        : listingKind === "prize-draw"
          ? "listingType==prize-draw"
          : listingKind === "standard"
            ? "listingType==standard"
            : undefined;

  const filters = [statusFilter, kindFilter].filter(Boolean).join(",") || undefined;

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

  const selection = useBulkSelection<ProductRow>({ items: rows, keyExtractor: (r) => r.id });

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

  // S-STORE-2-D — row click navigates to public detail/preview, NOT edit.
  // Edit is only available via the per-row "..." action menu.
  const handleRowClick = (row: ProductRow) => {
    const href =
      row.listingKind === "auction"
        ? `/auctions/${row.id}`
        : row.listingKind === "pre-order"
          ? `/pre-orders/${row.id}`
          : `/products/${row.id}`;
    void dispatch({ type: "NAVIGATE", href });
  };

  const handleDelete = async (row: ProductRow) => {
    if (!onDeleteProduct) return;
    setDeletingId(row.id);
    try {
      await onDeleteProduct(row.id);
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

  const handleBulkPrintLabels = useCallback(() => {
    const ids = selection.selectedIds.join(",");
    void dispatch({
      type: "NAVIGATE",
      href: `${String(ROUTES.STORE.INVENTORY_PRINT)}?type=product&ids=${ids}&autoprint=1`,
    });
  }, [selection.selectedIds, dispatch]);

  const handleSetLocation = useCallback(async (loc: PhysicalLocation) => {
    await fetch(SELLER_ENDPOINTS.PRODUCTS_BULK_LOCATION, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: selection.selectedIds, physicalLocation: loc }),
    });
    setSetLocationOpen(false);
  }, [selection.selectedIds]);

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
              rows={rows}
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
            rows={rows}
            isLoading={isLoading}
            emptyLabel={
              listingKind !== "all"
                ? `No ${listingKind} listings found`
                : "No products listed yet"
            }
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={(next) => selection.toggleAll()}
            getRowHref={(row) =>
              // S-STORE-2-D — row click → public detail/preview, not edit.
              row.listingKind === "auction"
                ? `/auctions/${row.id}`
                : row.listingKind === "pre-order"
                  ? `/pre-orders/${row.id}`
                  : `/products/${row.id}`
            }
            renderRowActions={
              onDeleteProduct
                ? (row) => (
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
                        onClick={(e) => { e.stopPropagation(); void handleDuplicate(row); }}
                        aria-label="Duplicate listing"
                        title="Duplicate"
                      >
                        ⧉
                      </Button>
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
                    </Row>
                  )
                : undefined
            }
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
