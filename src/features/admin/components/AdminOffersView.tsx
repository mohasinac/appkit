"use client";

/*
 * WHY: Offers had a seller surface (/store/offers) and a buyer surface
 *      (/user/offers) but no admin surface at all — despite the offers
 *      collection carrying real money commitments, a 48h locked price, and a
 *      lane that can block a buyer's whole cart. There was no way for support
 *      to see an offer, let alone clear a stuck one.
 * WHAT: The admin offers list. Cloned from SellerOffersView rather than
 *       AdminBidsView: the seller view is already offer-shaped and already
 *       satisfies `audit-listing-detail-affordance` (row click -> detail
 *       modal), whereas AdminBidsView is itself still on the Root Cause #56
 *       backlog and cloning it would have added a tenth violation.
 *
 * Two things differ from the seller view, both deliberate:
 *  - the buyer's real name/email is shown UNMASKED (the seller view masks via
 *    `maskOfferForSeller`) — an admin investigating a dispute needs identity;
 *  - the only mutation is Cancel. Accepting or countering on a seller's behalf
 *    is an authority nobody asked for, so `ADMIN_ROW_ACTIONS.offers` is
 *    deliberately just [VIEW, CANCEL].
 *
 * EXPORTS:
 *   AdminOffersView
 *
 * @tag domain:admin,offers
 * @tag layer:feature-view
 * @tag pattern:slot-shell
 * @tag access:client
 * @tag consumers:src/app/[locale]/admin/offers/page.tsx
 * @tag sideEffects:network
 */

import { useApiMutation, type JsonArray, type JsonObject } from "@mohasinac/appkit/client";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ConfirmDeleteModal,
  FilterChipGroup,
  ListingLayout,
  RecordDetailModal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_OFFER_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { ROUTES } from "../../../next/routing/route-map";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";

interface AdminOffersResponse {
  items?: JsonArray;
  total?: number;
}

interface OfferRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  /** Kept for the detail modal — a row you can act on must also be readable. */
  detail: JsonObject;
}

/** Terminal states — an offer here has nothing left to cancel. */
const TERMINAL_STATUSES = new Set(["paid", "declined", "expired", "withdrawn"]);

export type AdminOffersViewProps = ListingLayoutProps;

export function AdminOffersView({ children, ...props }: AdminOffersViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [detailRow, setDetailRow] = useState<OfferRow | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OfferRow | null>(null);

  const cancelMutation = useApiMutation({
    mutationFn: async (offerId: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.OFFER_BY_ID(offerId), { status: "expired" });
    },
    onSuccess: () => {
      showToast("Offer cancelled and cleared from the buyer's cart.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "offers"] });
      setCancelOpen(false);
      setSelectedRow(null);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to cancel offer.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminOffersResponse, OfferRow> = {
    portal: "admin",
    title: "Offers",
    searchPlaceholder: "Search offers by product, buyer, or store",
    emptyLabel: "No offers found",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "offers", "listing"],
    endpoint: ADMIN_ENDPOINTS.OFFERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: sortBy("offerAmount", "DESC"), label: "Highest offer" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `offer-${index}`),
        // The LISTING, not the offer id — a row identified only by
        // `offer-…-20260819-x7y8z9` is unreadable at a glance (Root Cause #52).
        primary: toStringValue(item.productTitle, "Untitled listing"),
        // Admin sees both sides of the negotiation, unmasked.
        secondary: [
          `Offer: ${toCurrency(item.offerAmount)}`,
          `Listed: ${toCurrency(item.listedPrice)}`,
          `${toStringValue(item.buyerName, "Unknown buyer")} → ${toStringValue(item.storeName, "Unknown store")}`,
        ].join(" · "),
        status: toStringValue(item.status, "pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        detail: item as JsonObject,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    // A menu of pure mutations is not a detail affordance (Root Cause #56) —
    // cancelling an offer without first reading it is acting blind.
    onRowClick: (row) => setDetailRow(row),
    buildFilters: (state) =>
      state.status && state.status !== "All"
        ? sieveFilter("status", SIEVE_OP.EQ, state.status)
        : undefined,
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: ROW_ACTION_ID.CANCEL,
        label: ACTIONS.ADMIN["cancel-offer"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          { label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label, onClick: () => setDetailRow(row) },
          {
            label: ACTIONS.ADMIN["cancel-offer"].label,
            destructive: true,
            disabled: TERMINAL_STATUSES.has(row.status),
            onClick: () => {
              setSelectedRow(row);
              setCancelOpen(true);
            },
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_OFFER_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  const d: JsonObject = detailRow?.detail ?? {};
  const productSlug = toStringValue(d.productSlug ?? d.productId, "");
  const paidOrderId = toStringValue(d.paidOrderId, "");

  return (
    <>
      <DataListingView config={config} />

      <RecordDetailModal
        isOpen={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={detailRow?.primary ?? "Offer"}
        badges={detailRow ? [{ label: detailRow.status }] : undefined}
        description={toStringValue(d.buyerNote, "")}
        fields={[
          { label: "Buyer", value: toStringValue(d.buyerName, "Unknown buyer") },
          { label: "Buyer email", value: toStringValue(d.buyerEmail, "—") },
          { label: "Store", value: toStringValue(d.storeName, "Unknown store") },
          { label: "Listed price", value: toCurrency(d.listedPrice) },
          { label: "Offered", value: toCurrency(d.offerAmount) },
          ...(d.counterAmount
            ? [{ label: "Seller counter", value: toCurrency(d.counterAmount) }]
            : []),
          ...(d.lockedPrice
            ? [{ label: "Locked price", value: toCurrency(d.lockedPrice) }]
            : []),
          ...(d.sellerNote
            ? [{ label: "Seller note", value: toStringValue(d.sellerNote, "") }]
            : []),
          { label: "Offer expires", value: toRelativeDate(d.expiresAt) },
          ...(d.checkoutDeadline
            ? [{ label: "Buyer must pay by", value: toRelativeDate(d.checkoutDeadline) }]
            : []),
          { label: "Created", value: toRelativeDate(d.createdAt) },
          { label: "Offer ID", value: detailRow?.id ?? "—" },
        ]}
        items={
          detailRow
            ? {
                heading: "Listing",
                entries: [
                  {
                    image: toStringValue(d.productImageUrl, "") || undefined,
                    title: detailRow.primary,
                    subtitle: toStringValue(d.productId, ""),
                    trailing: toCurrency(d.listedPrice),
                    href: productSlug
                      ? String(ROUTES.PUBLIC.PRODUCT_DETAIL(productSlug))
                      : undefined,
                  },
                  // A paid offer became a real order — link to it, so the
                  // "what happened next" question has an answer in one click.
                  ...(paidOrderId
                    ? [
                        {
                          title: `Order ${paidOrderId}`,
                          subtitle: "Placed from this offer",
                          href: String(ROUTES.ADMIN.ORDER_DETAIL(paidOrderId)),
                        },
                      ]
                    : []),
                ],
              }
            : undefined
        }
      />

      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) cancelMutation.mutate(selectedRow.id);
        }}
        isDeleting={cancelMutation.isPending}
        title={ACTIONS.ADMIN["cancel-offer"].confirmation!.title}
        message={ACTIONS.ADMIN["cancel-offer"].confirmation!.body}
        confirmText={ACTIONS.ADMIN["cancel-offer"].confirmation!.confirmLabel}
        variant="warning"
      />
    </>
  );
}
