"use client";

import { sieveFilter, SIEVE_OP, type JsonArray, type JsonObject } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { FilterChipGroup, ListingLayout, RowActionMenu, RecordDetailModal } from "../../../ui";
import { QuickFormDrawer } from "../../shell/QuickFormDrawer";
import { OfferPhaseTimeline } from "./OfferPhaseTimeline";
import { counterOfferFormSchema } from "../schemas/offer-forms";
import type { ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_OFFER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

/**
 * `/api/store/offers` returns `{ items, total, … }` via `successResponse`, and
 * apiClient already unwraps the `data` envelope. This interface used to declare
 * `offers` / `meta.total`, which are keys the route has never sent — so the
 * seller's list rendered empty forever with no error anywhere.
 */
interface SellerOffersResponse {
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

export interface SellerOffersViewProps extends ListingLayoutProps {
  onAcceptOffer?: (id: string) => Promise<void>;
  onRejectOffer?: (id: string) => Promise<void>;
  /**
   * Countering needs an amount, so this view hosts the form (a QuickFormDrawer,
   * per Rule #9) and hands the consumer the collected values — rather than the
   * old `(id) => void` shape, which left every consumer to invent its own input.
   */
  onCounterOffer?: (id: string, counterAmount: number, sellerNote?: string) => Promise<void>;
}

export function SellerOffersView({
  children,
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
  ...props
}: SellerOffersViewProps) {
  const [detailRow, setDetailRow] = React.useState<OfferRow | null>(null);
  const [counterRow, setCounterRow] = React.useState<OfferRow | null>(null);
  const [isCountering, setIsCountering] = React.useState(false);
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="seller" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<SellerOffersResponse, OfferRow> = {
    portal: "seller",
    title: "Offers",
    searchPlaceholder: "Search offers by product or buyer name",
    emptyLabel: "No offers received",
    filterKeys: ["status"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["seller", "offers", "listing"],
    endpoint: SELLER_ENDPOINTS.OFFERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `offer-${index}`),
        primary: toStringValue(item.productTitle ?? item.title, "Untitled product"),
        secondary: [
          `Offer: ${toCurrency(item.offerAmount ?? item.amount)}`,
          `Listed: ${toCurrency(item.listedPrice)}`,
          toStringValue(item.buyerName ?? "Unknown buyer", "Unknown buyer"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        detail: item as JsonObject,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    // A menu of pure mutations is not a detail affordance — the seller must be
    // able to READ the offer (buyer note, listed vs offered price, expiry)
    // before accepting or declining it (Root Cause #56).
    onRowClick: (row) => setDetailRow(row),
    buildFilters: (state) =>
      state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          { label: "View details", onClick: () => setDetailRow(row) },
          ...(onAcceptOffer
            ? [{ label: ACTIONS.STORE["accept-offer"].label, onClick: () => void onAcceptOffer(row.id) }]
            : []),
          ...(onCounterOffer
            ? [{ label: ACTIONS.STORE["counter-offer"].label, onClick: () => setCounterRow(row) }]
            : []),
          ...(onRejectOffer
            ? [{ label: ACTIONS.STORE["reject-offer"].label, destructive: true, onClick: () => void onRejectOffer(row.id) }]
            : []),
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={SELLER_OFFER_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  const d: JsonObject = detailRow?.detail ?? {};

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
          { label: "Listed price", value: toCurrency(d.listedPrice) },
          { label: "Offered", value: toCurrency(d.offerAmount) },
          ...(d.counterAmount
            ? [{ label: "Your counter", value: toCurrency(d.counterAmount) }]
            : []),
          ...(d.lockedPrice
            ? [{ label: "Agreed price", value: toCurrency(d.lockedPrice) }]
            : []),
          { label: "Offer expires", value: toRelativeDate(d.expiresAt) },
          ...(d.checkoutDeadline
            ? [{ label: "Buyer must pay by", value: toRelativeDate(d.checkoutDeadline) }]
            : []),
          ...(d.sellerNote ? [{ label: "Your note", value: toStringValue(d.sellerNote, "") }] : []),
        ]}
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
        isOpen={counterRow !== null}
        onClose={() => setCounterRow(null)}
        title={`Counter offer — ${counterRow?.primary ?? ""}`}
        submitLabel="Send counter"
        isLoading={isCountering}
        schema={counterOfferFormSchema}
        fields={[
          {
            name: "counterAmount",
            label: "Your counter price (₹)",
            type: "number",
            required: true,
            helperText: "Must be below your listed price and different from the buyer's offer.",
          },
          {
            name: "sellerNote",
            label: "Note to buyer (optional)",
            type: "textarea",
            placeholder: "Best I can do is …",
          },
        ]}
        onSubmit={async (values) => {
          if (!counterRow || !onCounterOffer) return;
          setIsCountering(true);
          try {
            await onCounterOffer(
              counterRow.id,
              Number(values.counterAmount),
              values.sellerNote ? String(values.sellerNote) : undefined,
            );
            setCounterRow(null);
          } finally {
            setIsCountering(false);
          }
        }}
      />
    </>
  );
}
