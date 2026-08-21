"use client";

import { sortBy, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../constants/index";
import { Div, Span, Stack, TextLink } from "../../../ui";
import { FieldSelect } from "../../../ui/forms";
import { AuctionBidsTable } from "../../auctions/components/AuctionBidsTable";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { BidDocument } from "../../auctions/schemas/firestore";

const SORT_OPTIONS = [
  { value: sortBy("bidDate", "DESC"), label: "Newest first" },
  { value: "bidDate", label: "Oldest first" },
  { value: sortBy("bidAmount", "DESC"), label: "Highest bid" },
  { value: "bidAmount", label: "Lowest bid" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "outbid", label: "Outbid" },
  { value: "won", label: "Won" },
  { value: "cancelled", label: "Cancelled" },
];

interface UserBidsResponse {
  bids?: BidDocument[];
  total?: number;
}

export function UserBidsView() {
  const config: ListingViewConfig<UserBidsResponse, BidDocument> = {
    portal: "user",
    title: "My Bids",
    searchPlaceholder: "Search by auction title…",
    emptyLabel: "You haven't placed any bids yet.",
    filterKeys: ["status"],
    defaultSort: sortBy("bidDate", "DESC"),
    queryKey: ["user", "bids", "listing"],
    endpoint: ACCOUNT_ENDPOINTS.BIDS,
    sortOptions: SORT_OPTIONS,
    hideTableView: true,
    mapRows: (response) => response.bids ?? [],
    getTotal: (response, rows) => response.total ?? rows.length,
    buildFilters: (state) => (state.status ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FieldSelect
        name="status"
        label="Bid status"
        value={pendingFilters.status || ""}
        onChange={(v) => setPendingFilters((p) => ({ ...p, status: v }))}
        options={STATUS_OPTIONS}
      />
    ),
    renderCards: (rows, _view, _selection, isLoading) => {
      if (isLoading) {
        return (
          <Stack gap="md">
            {Array.from({ length: 3 }).map((_, i) => (
              <Div key={i} className="h-16 animate-pulse border border-[var(--appkit-color-border)]" rounded="xl" />
            ))}
          </Stack>
        );
      }
      return (
        <AuctionBidsTable
          bids={rows}
          portal="buyer"
          totalPages={1}
          currentPage={1}
          onPageChange={() => {}}
          emptyLabel={
            <Span>
              You haven&apos;t placed any bids yet.{" "}
              <TextLink href={String(ROUTES.PUBLIC.AUCTIONS)}>
                Browse auctions
              </TextLink>
            </Span>
          }
        />
      );
    },
  };

  return <DataListingView config={config} />;
}
