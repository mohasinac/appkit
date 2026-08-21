"use client";
import { normalizeError } from "../../../errors/normalize";
import type { JsonValue, JsonArray } from "@mohasinac/appkit/client";

import { SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { Eye, EyeOff, Pencil, Trash2, Printer, MapPin } from "lucide-react";
import { PhysicalLocationModal } from "./PhysicalLocationModal";
import type { PhysicalLocation } from "./PhysicalLocationModal";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Badge, Button, Div, Row, Select, Span, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRODUCT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ROUTES } from "../../../constants";
import { normalizeListingType } from "../../products/utils/listing-type";
import type { ListingType } from "../../products/types";
import { toRecordArray, toRelativeDate, toStringValue } from "../hooks/useSellerListingData";
import { useListingTypeFlags } from "../../../react/hooks/useListingTypeFlags";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";

import { SellerProductsCards } from "./SellerProductsCards";
import { SellerProductsFilterFields } from "./SellerProductsFilterDrawer";
import { listingBadgeVariant } from "../../products/utils/listing-badge-variant";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig, ListingSelectionContext } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";

const FILTER_KEYS = [
  "status",
  "category",
  "brand",
  "condition",
  "minPrice",
  "maxPrice",
  "tags",
  "badges",
  "listingType",
  "showSold",
];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: sortBy("title", "DESC"), label: "Title Z–A" },
  { value: sortBy("price", "DESC"), label: "Price High" },
  { value: sortBy("price", "ASC"), label: "Price Low" },
  // Now genuinely sortable — see the note on AdminProductsView's sortOptions.
  { value: sortBy("featured", "DESC"), label: "Featured first" },
  { value: sortBy("isPromoted", "DESC"), label: "Promoted first" },
];
const STATUS_OPTIONS = SELLER_PRODUCT_STATUS_TABS;

/** A real listing type, or the dropdown's "no type filter" sentinel.
 *  `"bundle"` was removed 2026-08-21 — bundles are a `categoryType` on the
 *  `categories` collection (SB-UNI-D), so filtering products by it always
 *  returned zero rows. */
type ListingKind = ListingType | "all";

interface ProductRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  imageUrl?: string;
  image?: string;
  listingKind: ListingKind;
  price: string;
  physicalLocation?: { zone: string; shelf: string; bin: string };
}

interface SellerProductsResponse {
  products?: JsonArray;
  meta?: { total: number; totalPages?: number };
}

export interface SellerProductsViewProps {
  onDeleteProduct?: (id: string) => Promise<void>;
  onCreateClick?: () => void;
}

function TypeDropdown({
  active,
  onChange,
}: {
  active: ListingKind;
  onChange: (kind: ListingKind) => void;
}) {
  const flags = useListingTypeFlags();
  // Derived from ALL_LISTING_TYPES + the plugin registry (2026-08-21). This
  // used to be a hand-written list that had no `art`/`stickers` entries and
  // still offered `bundle` — which stopped being a listingType in SB-UNI-D, so
  // picking it filtered on a value no product can hold and returned nothing.
  const options: { value: ListingKind; label: string }[] = [
    { value: "all", label: "All listings" },
    ...ALL_LISTING_TYPES.filter(flags.isEnabled).map((type) => ({
      value: type as ListingKind,
      label: pluginFor(type).typeLabel,
    })),
  ];
  return (
    <Row paddingX="x-sm-lg-md" border="bottom" padding="y-xs" gap="sm">
      <Text className="tracking-wide text-[var(--appkit-color-text-muted)]" size="xs" weight="semibold" transform="uppercase">
        Listing type
      </Text>
      <Select
        options={options}
        value={active}
        onValueChange={(v) => onChange(v as ListingKind)}
        wrapperClassName="sm:max-w-xs"
        aria-label="Filter by listing type"
      />
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
        <Div className="relative w-10 h-10 flex-shrink-0 border border-[var(--appkit-color-border)]" rounded="lg" overflow="hidden">
          <MediaImage src={row.imageUrl} alt="" size="thumbnail" />
        </Div>
      ) : (
        <Row className="w-10 h-10 bg-[var(--appkit-color-surface-raised)] border border-[var(--appkit-color-border)]" align="center" justify="center" rounded="lg">
          <Span size="xs" color="faint">–</Span>
        </Row>
      ),
  },
  {
    key: "primary",
    header: "Product",
    render: (row) => (
      <Stack gap="xs">
        <Text className="text-[var(--appkit-color-text)] line-clamp-1" weight="medium">{row.primary}</Text>
        <Row gap="sm">
          <Badge variant={listingBadgeVariant(row.listingKind)}>
            {row.listingKind}
          </Badge>
          <Span size="xs" color="muted">{row.secondary}</Span>
        </Row>
      </Stack>
    ),
  },
  {
    key: "price",
    header: "Price",
    className: "w-28 text-right",
    render: (row) => (
      <Span size="sm" weight="medium" className="text-[var(--appkit-color-text)]">{row.price}</Span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => {
      const variant =
        row.status === "published"
          ? "success"
          : row.status === "draft"
            ? "default"
            : "danger";
      return <Badge variant={variant}>{row.status}</Badge>;
    },
  },
  {
    key: "updatedAt",
    header: "Updated",
    className: "w-28",
    render: (row) => <Span size="xs" color="muted">{row.updatedAt}</Span>,
  },
  {
    key: "physicalLocation",
    header: "Location",
    className: "w-28",
    render: (row) =>
      row.physicalLocation ? (
        <Span size="xs" className="font-mono text-[var(--appkit-color-text-muted)]">
          {row.physicalLocation.zone}/{row.physicalLocation.shelf}/{row.physicalLocation.bin}
        </Span>
      ) : (
        <Span size="xs" color="faint">—</Span>
      ),
  },
];

export function SellerProductsView({
  onDeleteProduct,
  onCreateClick,
}: SellerProductsViewProps) {
  const dispatch = useActionDispatch();
  const { showToast } = useToast();

  // Independent useUrlTable() instance for the type-dropdown + "Show sold"
  // toggle (Root Cause #35) — reads/writes the same URL params DataListingView's
  // own internal table also reads via `filterKeys`, so both stay in sync.
  const sideTable = useUrlTable({ defaults: { sort: DEFAULT_SORT } });
  const listingKind = ((sideTable.get("listingType") as ListingKind) || "all") as ListingKind;
  const showSold = sideTable.get("showSold") === "true";

  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    deleteFn: onDeleteProduct,
    onSuccess: (id) => { setDeletedIds((prev) => new Set([...prev, id])); },
  });
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, string>>(new Map());
  const [setLocationOpen, setSetLocationOpen] = useState(false);
  const [selectedIdsForLocation, setSelectedIdsForLocation] = useState<string[]>([]);

  const handleKindChange = useCallback(
    (kind: ListingKind) => {
      sideTable.setMany({ listingType: kind === "all" ? "" : kind, page: "1" });
    },
    [sideTable],
  );

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
    await performDelete(row.id);
  };

  const handleDuplicate = async (row: ProductRow) => {
    const res = await fetch(SELLER_ENDPOINTS.PRODUCT_DUPLICATE(row.id), {
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
      const res = await fetch(SELLER_ENDPOINTS.PRODUCT_BY_ID(row.id), {
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

  const handleSetLocation = useCallback(async (loc: PhysicalLocation, ids: string[]) => {
    try {
      const res = await fetch(SELLER_ENDPOINTS.PRODUCTS_BULK_LOCATION, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids, physicalLocation: loc }),
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
  }, [showToast]);

  const config: ListingViewConfig<SellerProductsResponse, ProductRow> = {
    portal: "seller",
    title: "Products",
    searchPlaceholder: "Search products by name…",
    emptyLabel: listingKind !== "all" ? `No ${listingKind} listings found` : "No products listed yet",
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "products", "listing", listingKind],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: SORT_OPTIONS,
    columns: PRODUCT_COLUMNS,
    toggles: [
      { label: "Show sold", active: showSold, onChange: (next) => sideTable.set("showSold", next ? "true" : "") },
    ],
    primaryAction: onCreateClick ? { label: "New Listing", onClick: onCreateClick } : undefined,
    mapRows: (response) => {
      const rows = toRecordArray(response.products).map((item, index) => {
        const lt = normalizeListingType(
          item as { listingType?: import("../../products/types").ListingType },
        );
        // The row's own type, verbatim. This used to be a 4-branch ternary
        // that collapsed classified / digital-code / live / art / stickers all
        // down to "standard", so five of nine types displayed the wrong badge
        // in the seller table (2026-08-21).
        const kind: ListingKind = lt;
        const priceRaw = typeof item.price === "number" ? item.price : 0;
        const auctionSecondary =
          kind === "auction"
            ? [
                typeof item.reservePrice === "number"
                  ? `Reserve ₹${item.reservePrice.toLocaleString("en-IN")}`
                  : null,
                `${typeof item.bidCount === "number" ? item.bidCount : 0} bids`,
                item.auctionEndDate
                  ? `Ends ${new Date(item.auctionEndDate as string).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "";
        return {
          id: toStringValue(item.id, `product-${index}`),
          primary: toStringValue(item.title ?? item.name, "Untitled product"),
          secondary: auctionSecondary || toStringValue(item.condition, ""),
          status: toStringValue(item.status, "draft"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          imageUrl: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
          image: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
          listingKind: kind,
          price: priceRaw ? `₹${priceRaw.toLocaleString("en-IN")}` : "—",
          physicalLocation:
            item.physicalLocation &&
            typeof (item.physicalLocation as Record<string, JsonValue>).zone === "string"
              ? (item.physicalLocation as { zone: string; shelf: string; bin: string })
              : undefined,
        };
      });
      return rows.filter((r) => !deletedIds.has(r.id)).map((r) =>
        statusOverrides.has(r.id) ? { ...r, status: statusOverrides.get(r.id)! } : r,
      );
    },
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (state) => {
      const statusFilter = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined;
      const kindFilter = !state.listingType || state.listingType === "all" ? undefined : sieveFilter("listingType", SIEVE_OP.EQ, state.listingType);
      const soldFilter = state.showSold === "true" ? undefined : "isSold==false";
      return [statusFilter, kindFilter, soldFilter].filter(Boolean).join(",") || undefined;
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <SellerProductsFilterFields
        pendingFilters={pendingFilters}
        statusOptions={STATUS_OPTIONS}
        onChange={setPendingFilters}
      />
    ),
    renderAboveContent: () => <TypeDropdown active={listingKind} onChange={handleKindChange} />,
    buildBulkActions: (selection: ListingSelectionContext<ProductRow>) => {
      const handleBulkPrintLabels = () => {
        const ids = selection.selectedIds.join(",");
        void dispatch({
          type: "NAVIGATE",
          href: `${String(ROUTES.STORE.PRINT_CENTER)}?type=product&ids=${ids}&autoprint=1`,
        });
      };
      return [
        buildBulkAction(ACTIONS.STORE["print-labels"], handleBulkPrintLabels, { icon: <Printer className="w-4 h-4" /> }),
        buildBulkAction(ACTIONS.STORE["set-location"], () => { setSelectedIdsForLocation(selection.selectedIds); setSetLocationOpen(true); }, { icon: <MapPin className="w-4 h-4" /> }),
      ] as BulkActionItem[];
    },
    renderCards: (rows, view, selection, isLoading) => (
      <SellerProductsCards
        view={view}
        rows={rows}
        isLoading={isLoading}
        listingKind={listingKind}
        selectedIds={new Set(selection.selectedIds)}
        toggle={selection.toggleSelect}
        onEdit={handleEdit}
        onDuplicate={(row) => void handleDuplicate(row)}
        onDelete={onDeleteProduct ? (row) => void handleDelete(row) : undefined}
      />
    ),
    rowHrefTemplate: (row) =>
      row.listingKind === "auction"
        ? `/auctions/${row.id}`
        : row.listingKind === "pre-order"
          ? `/pre-orders/${row.id}`
          : `/products/${row.id}`,
    renderRowActions: (row) => {
      const isPublished = (statusOverrides.get(row.id) ?? row.status) === "published";
      return (
        <Row gap="xs">
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
    },
  };

  return (
    <>
      <DataListingView config={config} />
      {setLocationOpen && (
        <PhysicalLocationModal
          count={selectedIdsForLocation.length}
          onSave={(loc) => handleSetLocation(loc, selectedIdsForLocation)}
          onClose={() => setSetLocationOpen(false)}
        />
      )}
    </>
  );
}
