"use client";

import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { FilterChipGroup, ListingLayout, RowActionMenu } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SELLER_OFFER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

interface SellerOffersResponse {
  offers?: unknown[];
  meta?: { total: number };
}

interface OfferRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface SellerOffersViewProps extends ListingLayoutProps {
  onAcceptOffer?: (id: string) => Promise<void>;
  onRejectOffer?: (id: string) => Promise<void>;
  onCounterOffer?: (id: string) => void;
}

export function SellerOffersView({
  children,
  onAcceptOffer,
  onRejectOffer,
  onCounterOffer,
  ...props
}: SellerOffersViewProps) {
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
      toRecordArray(response.offers).map((item, index) => ({
        id: toStringValue(item.id, `offer-${index}`),
        primary: toStringValue(item.productTitle ?? item.title, "Untitled product"),
        secondary: [
          `Offer: ${toRupees(item.offerAmount ?? item.amount)}`,
          toStringValue(item.buyerName ?? "Unknown buyer", "Unknown buyer"),
        ].join(" · "),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
    buildFilters: (state) =>
      state.status && state.status !== "All" ? `status==${state.status}` : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          ...(onAcceptOffer
            ? [{ label: ACTIONS.STORE["accept-offer"].label, onClick: () => void onAcceptOffer(row.id) }]
            : []),
          ...(onCounterOffer
            ? [{ label: ACTIONS.STORE["counter-offer"].label, onClick: () => onCounterOffer(row.id) }]
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

  return <DataListingView config={config} />;
}
