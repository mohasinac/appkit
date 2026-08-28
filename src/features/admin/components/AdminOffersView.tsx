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
  FilterChipGroup,
  ListingLayout,
  RecordDetailModal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_OFFER_STATUS_TABS } from "../constants/filter-tabs";
import { OfferPhaseTimeline } from "../../seller/components/OfferPhaseTimeline";
import { QuickFormDrawer } from "../../shell/QuickFormDrawer";
import { cancelOfferFormSchema } from "../../seller/schemas/offer-forms";
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
import { normalizeError } from "../../../errors/normalize";

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

  /**
   * Open on the SINGLE-ITEM response, not the row's cached list blob.
   *
   * Two reasons. The list payload has no `chain`, so a three-round negotiation
   * would render as one orphan round; and a modal opened on a list snapshot
   * shows whatever the last refetch happened to hold, which is the stale-editor
   * shape of Root Cause #38.
   *
   * The row is shown immediately and enriched when the fetch lands, so the
   * modal never blocks on the network.
   */
  const openDetail = async (row: OfferRow) => {
    setDetailRow(row);
    try {
      const full = await apiClient.get<JsonObject>(ADMIN_ENDPOINTS.OFFER_BY_ID(row.id));
      const detail = ((full as JsonObject)?.data ?? full) as JsonObject;
      if (detail && typeof detail === "object") {
        setDetailRow((prev) => (prev?.id === row.id ? { ...prev, detail } : prev));
      }
    } catch (err) {
      // The row's own data is already on screen, so this degrades to "no
      // chain" rather than to an empty modal. Say so instead of failing silently.
      const normalized = normalizeError(err);
      showToast(normalized.message || "Couldn't load the full offer history.", "error");
    }
  };

  const cancelMutation = useApiMutation({
    errorMessage: "Failed to cancel offer.",
    mutationFn: async ({ offerId, reason }: { offerId: string; reason: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.OFFER_BY_ID(offerId), {
        status: "expired",
        reason,
      });
    },
    onSuccess: () => {
      showToast("Offer cancelled and cleared from the buyer's cart.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "offers"] });
      setCancelOpen(false);
      setSelectedRow(null);
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
    // buildOfferSearchTxt indexes productTitle + productSlug + storeName. It does
    // NOT index buyerName or buyerEmail — those are PII, and the placeholder
    // must not promise a match it will never make.
    searchPlaceholder: "Search by product or store…",
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
    onRowClick: (row) => void openDetail(row),
    buildFilters: (state) =>
      state.status && state.status !== "All"
        ? sieveFilter("status", SIEVE_OP.EQ, state.status)
        : undefined,
    // No bulk actions, deliberately. There was a destructively-labelled
    // "Cancel offer" entry here whose onClick only called clearSelection() — a
    // registry-backed control that read as working and did nothing. Cancel now
    // requires a per-offer reason, and one shared reason across a mixed
    // selection is worse audit data than no bulk action at all.
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          { label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label, onClick: () => void openDetail(row) },
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
        extra={
          <OfferPhaseTimeline
            status={toStringValue(d.status, "pending")}
            timeline={d.timeline as never}
            timelineTruncated={d.timelineTruncated as never}
            superseded={Boolean(d.superseded)}
            createdAt={toStringValue(d.createdAt, "")}
            respondedAt={toStringValue(d.respondedAt, "")}
            acceptedAt={toStringValue(d.acceptedAt, "")}
            paidAt={toStringValue(d.paidAt, "")}
            chain={d.chain as never}
          />
        }
      />

      <QuickFormDrawer
        isOpen={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setSelectedRow(null);
        }}
        title={ACTIONS.ADMIN["cancel-offer"].confirmation!.title}
        schema={cancelOfferFormSchema}
        fields={[
          {
            name: "reason",
            label: "Reason for cancelling",
            type: "textarea",
            required: true,
            placeholder: "e.g. Listing withdrawn by the seller after a pricing error",
            helperText: `${ACTIONS.ADMIN["cancel-offer"].confirmation!.body} The buyer sees this reason, and it is recorded in the audit log.`,
          },
        ]}
        submitLabel={ACTIONS.ADMIN["cancel-offer"].confirmation!.confirmLabel}
        isLoading={cancelMutation.isPending}
        onSubmit={(values) => {
          if (!selectedRow) return;
          cancelMutation.mutate({
            offerId: selectedRow.id,
            reason: String(values.reason ?? ""),
          });
        }}
      />
    </>
  );
}
