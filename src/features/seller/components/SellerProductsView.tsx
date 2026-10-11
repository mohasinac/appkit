"use client";
import { formatPhysicalLocation } from "../../../utils/physical-location";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import type { JsonValue, JsonArray } from "@mohasinac/appkit/client";

import { SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit/client";
import { LOW_STOCK_THRESHOLD } from "../../store-extensions/constants/alert-metrics";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { Eye, EyeOff, Pencil, Trash2, Printer, MapPin, Boxes } from "lucide-react";
import { PhysicalLocationModal } from "./PhysicalLocationModal";
import { BulkStockModal } from "./BulkStockModal";
import type { PhysicalLocation } from "./PhysicalLocationModal";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { Badge, Button, Div, Row, Select, Span, Text, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_PRODUCT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ROUTES } from "../../../constants";
import { normalizeListingType } from "../../products/utils/listing-type";
import { useAvailabilityScope } from "../../products/hooks/useAvailabilityScope";
import type { ListingType } from "../../products/types";
import { toRecordArray, toStringValue } from "../hooks/useSellerListingData";
// Defining module (Root Cause #18) — the seller-side duplicate was deleted for drift.
import { toRelativeDate } from "../../admin/hooks/useAdminListingData";
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
  /*
   * The stock quick-filter. `FILTER_KEYS` had no stock key at all — stock
   * appeared only inside a row's subtitle string, so there was no way to ask
   * "what needs restocking" short of reading every row.
   *
   * Registered here (not in `buildExtraParams`) because it IS a drawer facet:
   * it narrows the list the way `condition` does, so it should inflate the
   * filter badge and be cleared by the drawer's Clear button. That is the
   * opposite call from the availability SCOPE, which is a tab and deliberately
   * stays out of `filterKeys` so a tab selection cannot be silently reset by
   * Clear.
   */
  "stockState",
];

/**
 * 🛑 Applied IN MEMORY, never as a Firestore clause.
 *
 * `availableQuantity <= N` is an inequality, and Firestore appends an
 * inequality's field to the `orderBy` implicitly — so pairing one with the
 * default `-createdAt` sort demands a composite index nobody declares, and the
 * `FAILED_PRECONDITION` gets swallowed into an empty page (Root Cause #59).
 * Same reasoning as the alert evaluator's `low_stock` branch.
 *
 * The honest cost is that it filters the PAGE rather than the collection: a
 * seller on page 1 of 200 listings sees the low-stock rows from those 50. That
 * is stated in the facet's own label rather than left for them to infer.
 */
const STOCK_STATE_OPTIONS = [
  { value: "", label: "Any stock level" },
  { value: "low", label: `Low — ${LOW_STOCK_THRESHOLD} or fewer left` },
  { value: "out", label: "Out of stock" },
  { value: "in", label: "In stock" },
];

function matchesStockState(stockValue: number | null, state: string): boolean {
  if (!state) return true;
  // 🛑 An unknown quantity matches NOTHING rather than everything. A listing
  // whose stock the API did not report is not evidence of being low, and
  // including it would put rows a seller cannot act on into a worklist.
  if (stockValue == null) return false;
  if (state === "out") return stockValue <= 0;
  if (state === "low") return stockValue > 0 && stockValue <= LOW_STOCK_THRESHOLD;
  if (state === "in") return stockValue > LOW_STOCK_THRESHOLD;
  return true;
}
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
  stock: string;
  /**
   * The number, for the column — `stock` is the human string for the row
   * subtitle. Two fields rather than parsing the string back out: a column
   * that re-derives a number from "5 in stock" breaks the day the suffix
   * changes, and silently.
   *
   * 🛑 `availableQuantity` when the API supplies it, else `stockQuantity`.
   * Those are two different numbers — `availableQuantity` is what
   * purchasability actually gates on in three places, and a seller shown
   * `stockQuantity` while the product is unbuyable is shown the figure that
   * does not decide anything (the restock bug A4 fixed, one surface over).
   */
  stockValue: number | null;
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
  /*
   * 🛑 `row.stock` was COMPUTED in `mapRows` and no column rendered it.
   *
   * Data fetched and discarded — Root Cause #52's shape — and the reason it
   * stayed invisible is that the figure also appears inside the row's
   * `secondary` string, so the information was technically on screen while
   * being unsortable, unfilterable and impossible to scan down a column.
   *
   * Both stock fields have been `canFilter`/`canSort` at the repository layer
   * the whole time; only the view omitted them.
   */
  {
    key: "stock",
    header: "Stock",
    className: "w-24 text-right",
    render: (row) => {
      if (row.stockValue == null) return <Span size="xs" color="faint">—</Span>;
      /*
       * Three states, not two, and the middle one is the point of the column.
       * `LOW_STOCK_THRESHOLD` is imported rather than re-picked here: the
       * alert, this column and the dashboard tile must agree on what "low"
       * means, or a seller gets a warning from one and a clean bill from
       * another.
       */
      /*
       * Three states, and `Span` has no `warning` variant — so "low" is
       * carried by WEIGHT plus a suffix rather than by colour alone. That is
       * better anyway: `audit-a11y` records that white-on-warning fails
       * contrast in this theme set, and a status conveyed only by colour is
       * invisible to a colour-blind seller.
       */
      const isOut = row.stockValue <= 0;
      const isLow = !isOut && row.stockValue <= LOW_STOCK_THRESHOLD;
      return (
        <Span
          size="sm"
          weight={isOut || isLow ? "semibold" : "normal"}
          color={isOut ? "error" : isLow ? "primary" : "muted"}
        >
          {row.stockValue}
          {isOut ? " · out" : isLow ? " · low" : ""}
        </Span>
      );
    },
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
    render: (row) => {
      // One formatter, shared with SellerOrdersView and PrintCenterView. It
      // also returns undefined for an all-blank location, which the bulk
      // routes genuinely allow — this used to print a bare "//".
      const loc = formatPhysicalLocation(row.physicalLocation);
      return loc ? (
        <Span size="xs" className="font-mono text-[var(--appkit-color-text-muted)]">
          {loc}
        </Span>
      ) : (
        <Span size="xs" color="faint">—</Span>
      );
    },
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
  // The scope bar spans whichever types the type-dropdown has narrowed to, so
  // its middle tab reads "Ended" on Auctions and "Sold" on Products.
  const scope = useAvailabilityScope(
    listingKind === "all" ? ALL_LISTING_TYPES : ([listingKind] as readonly ListingType[]),
  );

  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    deleteFn: onDeleteProduct,
    onSuccess: (id) => { setDeletedIds((prev) => new Set([...prev, id])); },
  });
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, string>>(new Map());
  const [setLocationOpen, setSetLocationOpen] = useState(false);
  const [selectedIdsForLocation, setSelectedIdsForLocation] = useState<string[]>([]);
  const [setStockOpen, setSetStockOpen] = useState(false);
  const [selectedIdsForStock, setSelectedIdsForStock] = useState<string[]>([]);
  const [stockBusy, setStockBusy] = useState(false);
  /*
   * 🛑 A local override, mirroring `statusOverrides` above, because this view
   * has no refetch handle — `DataListingView` owns the query. Without it a
   * bulk stock edit leaves the Stock column showing the OLD figure, which is
   * indistinguishable from the edit not having worked and is precisely the
   * class of defect this plan keeps finding (a 200 with a stale view).
   */
  const [stockOverrides, setStockOverrides] = useState<Map<string, number>>(new Map());

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
    // A swallowed failure here does nothing at all and says nothing — the
    // seller clicks Duplicate and no copy appears, with no way to tell whether
    // the request even left the browser.
    try {
      const res = await fetch(SELLER_ENDPOINTS.PRODUCT_DUPLICATE(row.id), {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Duplicate failed (${res.status})`);
      const json = await res.json().catch(() => null);
      const newId: string | undefined = json?.data?.id;
      if (newId) handleEdit({ ...row, id: newId });
    } catch (err) {
      showToast(normalizeError(err).message, "error");
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
      });
      if (!res.ok) throw new Error(`Could not change status (${res.status})`);
      setStatusOverrides((prev) => new Map([...prev, [row.id, newStatus]]));
    } catch (err) {
      // The row silently snapped back to its old status before this — a seller
      // could not tell a rejected publish from a UI that had not repainted.
      showToast(normalizeError(err).message, "error");
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
      const e = normalizeError(err);
      showToast(
        toUserMessage(e.code, undefined, { fallback: "Failed to update location." }),
        "error",
      );
    }
  }, [showToast]);

  const handleSetStock = useCallback(async (stockQuantity: number, ids: string[]) => {
    setStockBusy(true);
    try {
      const res = await fetch(SELLER_ENDPOINTS.PRODUCTS_BULK_STOCK, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids, stockQuantity }),
      });
      const body = (await res.json().catch(() => null)) as
        | { data?: { updated?: number; unchanged?: number; reservedHeld?: number }; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to update stock");
      /*
       * 🛑 Reports what the route actually DID, not what was asked for.
       *
       * `unchanged` is rows already at this figure — not written — and a toast
       * claiming "12 updated" over them would be exactly the count-it-had-not-
       * achieved defect `bulk-location`'s own header records.
       *
       * `reservedHeld` pre-empts the support ticket: a seller who sets 12 and
       * then sees 9 available has to be told why HERE, not after they report
       * the bulk edit as broken.
       */
      const d = body?.data ?? {};
      const parts = [`Stock set on ${d.updated ?? 0} listing(s)`];
      if (d.unchanged) parts.push(`${d.unchanged} already at that figure`);
      if (d.reservedHeld) parts.push(`${d.reservedHeld} still hold reserved units`);
      showToast(parts.join(" · ") + ".", "success");
      setStockOverrides((prev) => new Map([...prev, ...ids.map((id) => [id, stockQuantity] as const)]));
      setSetStockOpen(false);
    } catch (err) {
      const e = normalizeError(err);
      showToast(
        toUserMessage(e.code, undefined, { fallback: "Failed to update stock." }),
        "error",
      );
    } finally {
      setStockBusy(false);
    }
  }, [showToast]);

  const config: ListingViewConfig<SellerProductsResponse, ProductRow> = {
    portal: "seller",
    title: "Products",
    search: {
      placeholder: "Search by name, brand, tag — or a bin like A-3…",
      /*
       * The box understated itself: `/api/store/products` routes `q` through
       * `buildProductSearchTxt`, which indexes far more than the title. A
       * seller searching a brand or a tag got results and had no reason to
       * expect them.
       */
      /*
       * 🛑 `physicalLocation` is listed because C4 indexes it, and this list
       * is what the placeholder is derived from — an indexed field absent here
       * is a capability the seller is never told about. That is how "what is
       * in bin A-3" had no mechanism: the field was in no Sieve config, no
       * indexed-fields list, no searchTxt builder and no search field list,
       * so a seller could set a location and never query it.
       *
       * Both directions now run through this ONE box: search an item and read
       * its bin from the Location column; search a bin and get its contents.
       */
      fields: ["title", "description", "brand", "categoryNames", "tags", "features", "physicalLocation"],
    },
    emptyLabel: listingKind !== "all" ? `No ${listingKind} listings found` : "No products listed yet",
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "products", "listing", listingKind],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    sortOptions: SORT_OPTIONS,
    columns: PRODUCT_COLUMNS,
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
        /*
         * 🛑 THE STATUS GOES IN THE VISIBLE LINE, NOT ONLY IN `status`.
         *
         * `status` is mapped correctly and the API does emit it (measured:
         * "published" on every row) — but this view's right-hand slot holds
         * Edit / Duplicate / Delete, so unlike the admin table there is no
         * status chip and the value was never rendered anywhere. A seller
         * could not tell which of their listings were live without opening
         * each one, and a checklist case that begins "find a listing whose
         * status reads Published" had nothing to read.
         *
         * Same family as Root Cause #52: the data was already on the row and
         * the UI simply never presented it.
         */
        const statusLabel = toStringValue(item.status, "draft");
        /*
         * 🛑 PRICE AND STOCK GO IN THE VISIBLE LINE TOO — same reason as the
         * status note above, one field over.
         *
         * `price` was already mapped onto the row and correct, and this view
         * renders only `primary`, `secondary`, the type chip and the action
         * buttons — so it was never displayed. Measured on a real seller
         * account with 127 listings: ZERO rupee amounts and zero stock figures
         * anywhere in the list. To learn what one of their own listings costs
         * or how many are left, a seller had to open it.
         *
         * Those are the two numbers a seller scans for, so price leads.
         * `stockQuantity` was not mapped at all and is added here.
         *
         * An auction keeps its own summary (reserve / bids / ends) and is not
         * given a list price: for an auction the meaningful money is the
         * reserve and the current bid, both already in `auctionSecondary`, and
         * a "price" beside them would read as a third, competing figure.
         */
        const rowId = toStringValue(item.id, `product-${index}`);
        /*
         * A just-bulk-edited row reads from the override, mirroring how
         * `statusOverrides` repaints a toggled publish. 🛑 It overrides the
         * SELLER-authored figure only — `availableQuantity` is system-owned and
         * may legitimately be lower (reserved units), so claiming the new stock
         * as available would be the overwrite `resolveStockResync` exists to
         * prevent, rendered rather than written.
         */
        const stockOverride = stockOverrides.get(rowId);
        const availableRaw =
          typeof item.availableQuantity === "number" ? item.availableQuantity : null;
        const stockRaw =
          stockOverride ?? (typeof item.stockQuantity === "number" ? item.stockQuantity : null);
        const stockValue = stockOverride ?? availableRaw ?? stockRaw;
        const priceLabel =
          kind !== "auction" && priceRaw ? `₹${priceRaw.toLocaleString("en-IN")}` : "";
        const stockLabel = stockRaw === null ? "" : `${stockRaw} in stock`;
        const secondaryBase = auctionSecondary || toStringValue(item.condition, "");
        return {
          id: rowId,
          primary: toStringValue(item.title ?? item.name, "Untitled product"),
          secondary: [priceLabel, stockLabel, secondaryBase, statusLabel].filter(Boolean).join(" · "),
          status: statusLabel,
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          imageUrl: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
          image: toStringValue(item.mainImage ?? (item.images as string[])?.[0], undefined),
          listingKind: kind,
          price: priceRaw ? `₹${priceRaw.toLocaleString("en-IN")}` : "—",
          stock: stockLabel || "—",
          stockValue,
          physicalLocation:
            item.physicalLocation &&
            typeof (item.physicalLocation as Record<string, JsonValue>).zone === "string"
              ? (item.physicalLocation as { zone: string; shelf: string; bin: string })
              : undefined,
        };
      });
      /*
       * The stock predicate runs HERE, in the same pass that already drops
       * optimistically-deleted rows and applies status overrides — so there is
       * one place a row can be removed from the rendered list rather than two
       * that could disagree about which rows exist.
       */
      const stockState = sideTable.get("stockState") ?? "";
      return rows
        .filter((r) => !deletedIds.has(r.id) && matchesStockState(r.stockValue, stockState))
        .map((r) =>
          statusOverrides.has(r.id) ? { ...r, status: statusOverrides.get(r.id)! } : r,
        );
    },
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    buildFilters: (state) => {
      const statusFilter = state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined;
      const kindFilter = !state.listingType || state.listingType === "all" ? undefined : sieveFilter("listingType", SIEVE_OP.EQ, state.listingType);
      // The hardcoded `isSold==false` that used to live here is gone: it asked
      // a narrower question than the rest of the app (an ended auction is not
      // `isSold`), so the seller dashboard and /auctions disagreed about the
      // same rows. The scope param carries the per-type meaning instead.
      return [statusFilter, kindFilter].filter(Boolean).join(",") || undefined;
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <SellerProductsFilterFields
        pendingFilters={pendingFilters}
        statusOptions={STATUS_OPTIONS}
        stockStateOptions={STOCK_STATE_OPTIONS}
        onChange={setPendingFilters}
      />
    ),
    buildExtraParams: () => scope.extraParams,
    renderAboveContent: () => (
      <Stack gap="sm">
        <TypeDropdown active={listingKind} onChange={handleKindChange} />
        {scope.renderAboveContent()}
      </Stack>
    ),
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
        buildBulkAction(ACTIONS.STORE["set-stock"], () => { setSelectedIdsForStock(selection.selectedIds); setSetStockOpen(true); }, { icon: <Boxes className="w-4 h-4" /> }),
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
      {setStockOpen && (
        <BulkStockModal
          count={selectedIdsForStock.length}
          busy={stockBusy}
          onSave={(qty) => handleSetStock(qty, selectedIdsForStock)}
          onClose={() => setSetStockOpen(false)}
        />
      )}
    </>
  );
}
