"use client";

import type { OrderAddonBadgesOrder } from "../../orders/components/OrderAddonBadges";
import type { OrderSourceContext } from "../../orders/schemas/firestore";
import { groupOrderItemsByLine } from "../../orders/utils/bundle-grouping";
import { sieveFilter, SIEVE_OP, type JsonArray, type JsonValue } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FilterChipGroup, ListingLayout, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { apiClient } from "../../../http";
import { QuickEditMenu } from "./QuickEditMenu";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { ADMIN_ORDER_STATUS_TABS, ADMIN_ORDER_PAYMENT_REVIEW_TABS } from "../constants/filter-tabs";
import { isManualPaymentMethod, isPaymentReviewQueueMode } from "../../orders/constants/payment-window";
import { useOrderScope } from "../../orders/components/OrderScopeTabs";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
  type ListingItemRecord,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminOrderEditorView, type AdminOrderItemRow, type AdminOrderEditorViewProps } from "./AdminOrderEditorView";

interface AdminOrdersResponse {
  items?: JsonArray;
  meta?: { total?: number };
}

/**
 * `OrderDocument` has no `orderNumber` field — the real item info an order
 * list row should show lives in the denormalized `items[]` snapshot
 * (`productTitle`/`image`), written at order time specifically so list/detail
 * UI never needs an extra product fetch. Falling back to `Order {id}` (a raw
 * GUID) instead was Root Cause Pattern #(order-guid) — see CLAUDE.md.
 */
function toOrderItemRows(item: ListingItemRecord): AdminOrderItemRow[] {
  const raw = Array.isArray(item.items) ? item.items : [];
  /*
   * Fall back to the LEGACY flat shape when `items[]` is absent.
   *
   * `items[]` is canonical and every real checkout writes it, but older
   * documents carry `productId`/`productTitle`/`quantity` at the top level
   * instead. Reading only `items[]` rendered those rows as "Order <raw id>"
   * beside a placeholder emoji — the product was known, just not where this
   * looked.
   *
   * Root Cause #42's rule: prefer making the READER resilient over fixing only
   * today's seed data, because the next hand-written fixture or legacy
   * document will land in the same shape.
   */
  const items =
    raw.length > 0
      ? raw
      : typeof item.productTitle === "string" && item.productTitle
        ? [
            {
              productId: item.productId,
              productTitle: item.productTitle,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              image: item.image,
            } as Record<string, unknown>,
          ]
        : [];
  return items
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      productId: typeof entry.productId === "string" ? entry.productId : "",
      title: typeof entry.productTitle === "string" ? entry.productTitle : "Item",
      image: typeof entry.image === "string" ? entry.image : undefined,
      quantity: typeof entry.quantity === "number" ? entry.quantity : 1,
      unitPrice: typeof entry.unitPrice === "number" ? entry.unitPrice : 0,
      totalPrice: typeof entry.totalPrice === "number" ? entry.totalPrice : 0,
      /*
       * The collapse keys, carried so the editor can group a bundle or
       * buyer-assembled group back into one line the way the buyer's receipt
       * does. Narrowed by `typeof` like every field above rather than cast —
       * this function's whole job is turning a loose record into a typed row,
       * and a cast here is how `title`/`price` once slipped through (RC#45).
       */
      groupSlug: typeof entry.groupSlug === "string" ? entry.groupSlug : undefined,
      groupTitle: typeof entry.groupTitle === "string" ? entry.groupTitle : undefined,
      bundleCategorySlug:
        typeof entry.bundleCategorySlug === "string" ? entry.bundleCategorySlug : undefined,
      bundleProductIds: Array.isArray(entry.bundleProductIds)
        ? entry.bundleProductIds.filter((v): v is string => typeof v === "string")
        : undefined,
    }));
}

/*
 * The row's headline, counted in LINES rather than item rows.
 *
 * 🛑 `extraCount` deliberately changed meaning when grouping landed: it was
 * `items.length - 1`, so a bundle of four read "Dranzer S +3 more" — naming an
 * arbitrary member and implying four separate things were bought. It is now
 * `groups.length - 1`, so the same order reads "Starter Bundle +0" and a
 * bundle plus one standalone reads "+1 more". The number a buyer or admin
 * reads on a row should match the number of lines they will see inside it.
 */
/*
 * `sourceContext` arrives as JsonValue off the raw admin-list doc, so it can
 * be a string, an array or null — none of which `OrderProvenanceCard` can
 * switch on. This narrows to "an object carrying a `path` tag" and nothing
 * further: that is deliberately NOT the card's own switch duplicated, it only
 * establishes that there is a tag to switch on, which is what makes the single
 * cast true instead of hopeful. `as unknown as OrderSourceContext` would
 * assert exactly the same thing while checking nothing (Root Cause #98).
 */
function toSourceContext(value: JsonValue | undefined): OrderSourceContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  /*
   * Via `object` rather than straight off the JsonValue union, for two
   * reasons that pull the same way. `Array.isArray` does not narrow
   * `JsonArray | JsonObject` apart, so `value.path` does not resolve; and
   * `OrderSourceContext` is not assignable to `JsonObject` (its optional
   * members admit `undefined`, which is not a JsonValue), so TS refuses that
   * conversion outright. Probing as `{ path?: string }` keeps both the probe
   * and the assertion legal without an `unknown` anywhere.
   */
  const obj: object = value;
  return typeof (obj as { path?: string }).path === "string"
    ? (obj as OrderSourceContext)
    : undefined;
}

function firstOrderItem(item: ListingItemRecord): { image?: string; title?: string; extraCount: number } {
  const groups = groupOrderItemsByLine(toOrderItemRows(item));
  const first = groups[0];
  const extraCount = Math.max(0, groups.length - 1);
  if (!first) return { extraCount: 0 };
  if (first.kind === "single") {
    return { image: first.item.image, title: first.item.title, extraCount };
  }
  return {
    image: first.items[0]?.item.image,
    title: first.groupTitle ?? "Grouped purchase",
    extraCount,
  };
}

/**
 * Short marker appended to a row's secondary line so a manual payment needing
 * action is visible in the list itself, not only after opening the drawer.
 * Mirrors the same `paymentProofUrl` / `paymentReviewOutcome` derivation the
 * server-side queue uses (`listPaymentReviewQueue`) — kept in sync by reading
 * the same two fields rather than a denormalised flag (Root Cause #42).
 */
function paymentReviewLabel(item: ListingItemRecord): string | undefined {
  if (!isManualPaymentMethod(toStringValue(item.paymentMethod, ""))) return undefined;
  if (toStringValue(item.paymentStatus, "") === "paid") return "Payment verified";
  const outcome = toStringValue(item.paymentReviewOutcome, "");
  if (outcome === "rejected_fraud") return "Payment rejected";
  if (outcome === "reupload_requested") return "Re-upload requested";
  return item.paymentProofUrl ? "Awaiting verification" : "Awaiting payment";
}

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  image?: string;
  items: AdminOrderItemRow[];
  paymentProofUrl?: string;
  paymentTransactionId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  displayedUpiId?: string;
  buyerReportedUpiId?: string;
  paymentUpiMismatch?: boolean;
  buyerMarkedPaid?: boolean;
  buyerFraudAgreementAccepted?: boolean;
  /** Prior review outcome — the row already derives its label from this; the
   *  editor needs it too so a decided order stops offering Verify/Reject. */
  paymentReviewOutcome?: string;
  /** Paid add-ons + coupon, surfaced as icon chips in the editor. */
  addons?: OrderAddonBadgesOrder;
  /*
   * Provenance, carried to the drawer. 🛑 It has to travel on the ROW: the
   * drawer is fed entirely from `selectedRow` and never fetches the order
   * itself, so a field missing here is `undefined` in the editor no matter
   * what the single-order endpoint returns — Root Cause #38 exactly.
   *
   * Safe to read straight off the list item because this route returns
   * `maskedOrders`, i.e. whole documents rather than a hand-picked serializer
   * (the same reason `addons` below needs no serializer entry).
   */
  sourceContext?: OrderSourceContext;
  /*
   * D55 — the pre-order balance. Same reasoning as `sourceContext` above:
   * this route returns whole masked documents, so the field arrives with no
   * serializer entry and the only thing that was ever missing is the local
   * type and the prop pass-through (Root Cause #38).
   */
  balance?: AdminOrderEditorViewProps["balance"];
  currency?: string;
}

export type AdminOrdersViewProps = ListingLayoutProps;

export function AdminOrdersView({ children, ...props }: AdminOrdersViewProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OrderRow | null>(null);

  const handleQuickStatus = useCallback(
    async (id: string, status: string) => {
      try {
        await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(id), { status });
        showToast("Order status updated.", "success");
      } catch (err) {
        showToast((err as Error)?.message ?? "Failed to update order.", "error");
        throw err;
      }
    },
    [showToast],
  );

  /*
   * 🛑 ABOVE the `children` short-circuit. `useOrderScope` sat below it, so a
   * caller passing children skipped the hook entirely and the hook order
   * differed between the two render paths — React then reads one hook's state
   * into another's slot. A hook must run on every render of a component, which
   * means before any conditional return, always.
   */
  const orderScope = useOrderScope();

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }


  const config: ListingViewConfig<AdminOrdersResponse, OrderRow> = {
    portal: "admin",
    title: "Orders",
    // Restored: `orders` has searchTxt and `/api/admin/orders` reads `q`.
    //
    // Matches the product, the store and the tracking number — deliberately NOT
    // the buyer's name or email. Those are ORDER_PII_FIELDS, encrypted at rest,
    // and a searchTxt for a name IS that name re-encoded (D1). The placeholder
    // says what it matches so it does not promise the buyer lookup it cannot do.
    search: {
      placeholder: "Product, store, or tracking number",
      mode: "partial",
      fields: ["productTitle", "storeName", "trackingNumber"],
    },
    emptyLabel: "No orders found",
    filterKeys: ["status", "paymentReview"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "orders", "listing"],
    endpoint: ADMIN_ENDPOINTS.ORDERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const orderId = toStringValue(item.id, `order-${index}`);
        const { image, title, extraCount } = firstOrderItem(item);
        return {
          id: orderId,
          primary: title
            ? `${title}${extraCount > 0 ? ` +${extraCount} more` : ""}`
            : `Order ${orderId}`,
          secondary: [
            /*
             * 🛑 `userName` and `totalPrice` FIRST — they are the document's
             * real field names (OrderDocument, and the live response of
             * GET /api/admin/orders).
             *
             * This read `buyerName ?? customerName` and
             * `totalAmount ?? total ?? amount`: five names, not one of which
             * the order document has ever carried. So every row rendered
             * "Unknown buyer · -", on all 25 rows, for as long as the view has
             * existed — and the `??` chains made it look like considered
             * defensive coding rather than a guess. A fallback spelled three
             * ways is the tell that nobody checked which one was real.
             *
             * The aliases are GONE rather than demoted to fallbacks: nothing
             * declares them (the client `Order` type has no such fields) and
             * nothing emits them (no adapter renames to them). Keeping a
             * fallback with no producer only preserves the ambiguity that
             * hid the bug.
             */
            toStringValue(item.userName, "Unknown buyer"),
            toCurrency(item.totalPrice),
            /*
             * Not `.slice(0, 14)` — that cut mid-date, so
             * `order-1-20260822-aucwon` and `order-1-20260821-prizedr` both
             * rendered as "order-1-202608". A truncation that destroys
             * uniqueness is worse than a long string, because the id is the
             * one thing on the row an admin searches by.
             */
            orderId,
            paymentReviewLabel(item),
          ]
            .filter(Boolean)
            .join(" · "),
          status: toStringValue(item.status, "Unknown"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          image,
          items: toOrderItemRows(item),
          paymentProofUrl: toStringValue(item.paymentProofUrl, "") || undefined,
          paymentTransactionId: toStringValue(item.paymentTransactionId, "") || undefined,
          paymentMethod: toStringValue(item.paymentMethod, "") || undefined,
          paymentStatus: toStringValue(item.paymentStatus, "") || undefined,
          displayedUpiId: toStringValue(item.displayedUpiId, "") || undefined,
          buyerReportedUpiId: toStringValue(item.buyerReportedUpiId, "") || undefined,
          paymentUpiMismatch: Boolean(item.paymentUpiMismatch),
          buyerMarkedPaid: Boolean(item.buyerMarkedPaid),
          buyerFraudAgreementAccepted: Boolean(item.buyerFraudAgreementAccepted),
          paymentReviewOutcome: toStringValue(item.paymentReviewOutcome, "") || undefined,
          // Straight off the order document — the admin list route returns
          // raw docs, so these need no serializer entry (cf. Root Cause #38).
          addons: {
            giftWrapAddon: Boolean(item.giftWrapAddon),
            giftWrapFee: Number(item.giftWrapFee ?? 0) || undefined,
            giftWrapMessage: toStringValue(item.giftWrapMessage) || undefined,
            shipmentProtectionAddon: Boolean(item.shipmentProtectionAddon),
            shipmentProtectionFee: Number(item.shipmentProtectionFee ?? 0) || undefined,
            couponCode: toStringValue(item.couponCode) || undefined,
            couponDiscount: Number(item.couponDiscount ?? 0) || undefined,
          },
          // Raw doc in, so no serializer entry — but unlike `addons` above,
          // which coerces every field by hand, this one needs a tag check
          // before it can be trusted. See `toSourceContext`.
          sourceContext: toSourceContext(item.sourceContext),
          /*
           * D55. Coerced field by field like `addons` above, deliberately
           * NOT `as AdminOrderEditorViewProps["balance"]` — a cast at a
           * raw-document boundary is where Root Cause #98 lives, and main
           * had just removed the same cast from `sourceContext` one line up.
           *
           * `proofUrl` is omitted ON PURPOSE: this is the LIST payload, and
           * the screenshot is admin-detail only. A list row never needs it.
           */
          balance: item.balance
            ? {
                amount: Number((item.balance as Record<string, unknown>).amount ?? 0),
                status: toStringValue(
                  (item.balance as Record<string, unknown>).status,
                  "awaiting",
                ) as "awaiting" | "submitted" | "paid" | "rejected",
                transactionId:
                  toStringValue((item.balance as Record<string, unknown>).transactionId) ||
                  undefined,
                reviewNote:
                  toStringValue((item.balance as Record<string, unknown>).reviewNote) ||
                  undefined,
              }
            : undefined,
          currency: toStringValue(item.currency, "") || undefined,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    // The payment-review queue is always `status == pending` by definition, so
    // a status chip on top of it could only ever narrow to zero rows. When the
    // queue is active the status filter is dropped rather than combined.
    buildFilters: (f) => {
      if (isPaymentReviewQueueMode(f.paymentReview ?? "")) return undefined;
      return f.status && f.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, f.status) : undefined;
    },
    // The payment-review queue is its own mode — it already ignores `status`
    // (see buildFilters above), so it must ignore the lifecycle scope too, or
    // an admin opening the queue from the default Active tab would see it
    // silently narrowed.
    buildExtraParams: (f) =>
      isPaymentReviewQueueMode(f.paymentReview ?? "")
        ? { paymentReview: f.paymentReview }
        : orderScope.extraParams,
    renderAboveContent: orderScope.renderAboveContent,
    // Mirrors the row action's "View full details" entry so the row itself
    // is clickable, not just the overflow menu.
    onRowClick: (row) => {
      setSelectedRow(row);
      setDrawerOpen(true);
    },
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] => {
      const statusByAction: Record<(typeof ADMIN_BULK_ACTIONS.orders)[number], string> = {
        [ROW_ACTION_ID.MARK_SHIPPED]: "shipped",
        [ROW_ACTION_ID.MARK_DELIVERED]: "delivered",
        [ROW_ACTION_ID.CANCEL]: "cancelled",
      };
      const variantByAction: Record<(typeof ADMIN_BULK_ACTIONS.orders)[number], "secondary" | "primary" | "danger"> = {
        [ROW_ACTION_ID.MARK_SHIPPED]: "secondary",
        [ROW_ACTION_ID.MARK_DELIVERED]: "primary",
        [ROW_ACTION_ID.CANCEL]: "danger",
      };
      return ADMIN_BULK_ACTIONS.orders.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        variant: variantByAction[id],
        onClick: () => {
          for (const rowId of selection.selectedIds) void handleQuickStatus(rowId, statusByAction[id]);
          selection.clearSelection();
        },
      }));
    },
    renderRowActions: (row) => (
      <QuickEditMenu
        actions={[
          {
            label: "View full details",
            onClick: () => {
              setSelectedRow(row);
              setDrawerOpen(true);
            },
          },
          {
            label: "Open full page",
            onClick: () => router.push(String(ROUTES.ADMIN.ORDER_DETAIL(row.id))),
          },
          {
            label: "Update status",
            separator: true,
            formTitle: "Update Order Status",
            fields: [
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: ADMIN_ORDER_STATUS_TABS.filter((t) => t.id !== "All").map((t) => ({
                  value: t.id,
                  label: t.label,
                })),
              },
            ],
            defaultValues: { status: row.status },
            onSubmit: (vals) => handleQuickStatus(row.id, String(vals.status ?? "")),
            submitLabel: "Update",
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_ORDER_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id, paymentReview: "" }))}
        />
        <FilterChipGroup
          label="Manual payment"
          tabs={ADMIN_ORDER_PAYMENT_REVIEW_TABS}
          value={pendingFilters.paymentReview ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, paymentReview: id, status: "" }))}
        />
      </>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminOrderEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orderId={selectedRow?.id}
        orderLabel={selectedRow?.primary}
        currentStatus={selectedRow?.status}
        items={selectedRow?.items}
        paymentProofUrl={selectedRow?.paymentProofUrl}
        paymentTransactionId={selectedRow?.paymentTransactionId}
        paymentMethod={selectedRow?.paymentMethod}
        paymentStatus={selectedRow?.paymentStatus}
        displayedUpiId={selectedRow?.displayedUpiId}
        buyerReportedUpiId={selectedRow?.buyerReportedUpiId}
        paymentUpiMismatch={selectedRow?.paymentUpiMismatch}
        buyerMarkedPaid={selectedRow?.buyerMarkedPaid}
        buyerFraudAgreementAccepted={selectedRow?.buyerFraudAgreementAccepted}
        paymentReviewOutcome={selectedRow?.paymentReviewOutcome}
        addons={selectedRow?.addons}
        sourceContext={selectedRow?.sourceContext}
        balance={selectedRow?.balance}
        currency={selectedRow?.currency}
      />
    </>
  );
}
