"use client";

import React, { useState, useCallback } from "react";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { X, Pencil, Trash2 } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Alert, ListingToolbar, Pagination, ListingViewShell, Badge, Button } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
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

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "-price", label: "Price High" },
  { value: "price", label: "Price Low" },
];
const STATUS_OPTIONS = ["All", "active", "draft", "archived", "sold"];

type ListingKind = "all" | "standard" | "auction" | "pre-order" | "prize-draw";

interface ProductRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  imageUrl?: string;
  listingKind: ListingKind;
  price: string;
}

interface SellerProductsResponse {
  products?: unknown[];
  meta?: { total: number; totalPages?: number };
}

export interface SellerProductsViewProps extends ListingViewShellProps {
  onDeleteProduct?: (id: string) => Promise<void>;
}

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
  ];
  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 overflow-x-auto border-b border-[var(--appkit-color-border)]">
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
    </div>
  );
}

const KIND_BADGE_VARIANT: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  auction: "warning",
  "pre-order": "secondary",
  "prize-draw": "primary",
  standard: "default",
};

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
        <div className="w-10 h-10 rounded-lg bg-[var(--appkit-color-surface-raised)] border border-[var(--appkit-color-border)] flex items-center justify-center">
          <span className="text-xs text-[var(--appkit-color-text-faint)]">–</span>
        </div>
      ),
  },
  {
    key: "primary",
    header: "Product",
    render: (row) => (
      <div className="space-y-1">
        <p className="font-medium text-[var(--appkit-color-text)] line-clamp-1">{row.primary}</p>
        <div className="flex items-center gap-2">
          <Badge variant={KIND_BADGE_VARIANT[row.listingKind] ?? "default"}>
            {row.listingKind}
          </Badge>
          <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.secondary}</span>
        </div>
      </div>
    ),
  },
  {
    key: "price",
    header: "Price",
    className: "w-28 text-right",
    render: (row) => (
      <span className="text-sm font-medium text-[var(--appkit-color-text)]">{row.price}</span>
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
      <span className="text-xs text-[var(--appkit-color-text-muted)]">{row.updatedAt}</span>
    ),
  },
];

export function SellerProductsView({
  onDeleteProduct,
  children,
  ...props
}: SellerProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const dispatch = useActionDispatch();

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [listingKind, setListingKind] = useState<ListingKind>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
    if (!confirm(`Delete "${row.primary}"? This cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      await onDeleteProduct(row.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search products by name…"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || DEFAULT_SORT}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
          hideViewToggle
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        <TypeChips active={listingKind} onChange={handleKindChange} />

        {totalPages > 1 && (
          <div
            className="sticky z-10 flex justify-center bg-[var(--appkit-color-surface)]/95 backdrop-blur-sm border-b border-[var(--appkit-color-border)] px-3 py-1.5"
            style={{ top: "calc(var(--header-height, 0px) + 44px)" }}
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
          </div>
        )}

        <div className="py-4 px-3 sm:px-4">
          {errorMessage && (
            <Alert variant="error" className="mb-4">{errorMessage}</Alert>
          )}
          <DataTable
            columns={PRODUCT_COLUMNS}
            rows={rows}
            isLoading={isLoading}
            emptyLabel={
              listingKind !== "all"
                ? `No ${listingKind} listings found`
                : "No products listed yet"
            }
            getRowHref={(row) =>
              row.listingKind === "auction"
                ? String(ROUTES.STORE.AUCTIONS_EDIT(row.id))
                : row.listingKind === "pre-order"
                  ? String(ROUTES.STORE.PRE_ORDERS_EDIT(row.id))
                  : row.listingKind === "prize-draw"
                    ? String(ROUTES.STORE.PRIZE_DRAWS_EDIT(row.id))
                    : String(ROUTES.STORE.PRODUCTS_EDIT(row.id))
            }
            renderRowActions={
              onDeleteProduct
                ? (row) => (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleDelete(row); }}
                        disabled={deletingId === row.id}
                        aria-label="Delete"
                        className="text-[var(--appkit-color-error)] hover:bg-[var(--appkit-color-border-subtle)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                : undefined
            }
          />
        </div>

        {filterOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              aria-hidden="true"
              onClick={() => setFilterOpen(false)}
            />
            <div
              className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[var(--appkit-color-surface)] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--appkit-color-border)] px-4 py-3.5">
                <span className="text-base font-semibold text-[var(--appkit-color-text)]">Filters</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-error)] transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--appkit-color-text-muted)]">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setPendingFilters((p) => ({ ...p, status: opt === "All" ? "" : opt }))
                        }
                        className={[
                          "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                          (pendingFilters.status || "All") === opt
                            ? "bg-[var(--appkit-color-primary)] text-white border-[var(--appkit-color-primary)]"
                            : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)]",
                        ].join(" ")}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--appkit-color-border)] px-4 py-3.5">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="w-full rounded-lg bg-[var(--appkit-color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
