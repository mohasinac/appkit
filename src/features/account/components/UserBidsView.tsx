"use client";

import { sortBy, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../constants/index";
import { useState } from "react";
import { Div } from "../../../ui/components/Div";
import { Span } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";
import { TextLink } from "../../../ui/components/TextLink";
import { RecordDetailModal } from "../../../ui/components/RecordDetailModal";
import { buildBidDetailFields, bidStatusBadge } from "../../collector-drops/components/bid-detail-fields";
import { FieldSelect } from "../../../ui/forms";
import { CollectorDropBidsTable } from "../../collector-drops/components/CollectorDropBidsTable";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { BidDocument } from "../../collector-drops/schemas/firestore";
import { useListingTypeFlags } from "../../../react/hooks/useListingTypeFlags";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

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
  items?: BidDocument[];
  total?: number;
}

export interface UserBidsViewProps {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function UserBidsView({ pageRegionCards = [] }: UserBidsViewProps = {}) {
  // A bid could be seen in this list and never opened — no row click, no row
  // action, no detail page. The "Browse collector drops" link in the empty state is
  // not an affordance: it is not row-scoped, and it only shows when there are
  // no bids at all.
  const [detail, setDetail] = useState<BidDocument | null>(null);
  /*
   * 🛑 `isListed`, not the indexed/`isEnabled` form. This gates a LINK a
   * visitor clicks, and an `"unlisted"` type is one the owner asked to leave
   * with "no way to jump to them" while its own pages keep serving. The
   * indexed form answers "does the site still sell this", which stays true for
   * unlisted — so reading it here put this link back on screen after the type
   * was unlisted, which is exactly the dead end the comment below forbids.
   */
  const collectorDropsListed = useListingTypeFlags().isListed("collector-drop");

  const config: ListingViewConfig<UserBidsResponse, BidDocument> = {
    portal: "user",
    title: "My Bids",
    search: {
      placeholder: "Search by collector drop title…",
      // `/api/user/bids` filters in memory: `(b.productTitle ?? "").includes(q)`.
      // The bid document carries no other text.
      fields: ["productTitle"],
    },
    emptyLabel: "You haven't placed any bids yet.",
    filterKeys: ["status"],
    defaultSort: sortBy("bidDate", "DESC"),
    queryKey: ["user", "bids", "listing"],
    endpoint: ACCOUNT_ENDPOINTS.BIDS,
    sortOptions: SORT_OPTIONS,
    hideTableView: true,
    mapRows: (response) => response.items ?? [],
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
        <CollectorDropBidsTable
          bids={rows}
          portal="buyer"
          onRowClick={(bid) => setDetail(bid)}
          totalPages={1}
          currentPage={1}
          onPageChange={() => {}}
          emptyLabel={
            <Span>
              You haven&apos;t placed any bids yet.
              {/* The CTA follows the listing type, not the page. A buyer's
                  past bids outlive collector drops being switched off, so the page
                  stays; inviting them to browse a catalogue the site no
                  longer offers would be a dead end. */}
              {collectorDropsListed && (
                <>
                  {" "}
                  <TextLink href={String(ROUTES.PUBLIC.COLLECTOR_DROPS)}>
                    Browse collector drops
                  </TextLink>
                </>
              )}
            </Span>
          }
        />
      );
    },
  };

  const badge = detail ? bidStatusBadge(detail.status) : null;

  return (
    <>
      <DataListingView config={config} />
      <AdminComposableRegion pageId="user-bids" initialCards={pageRegionCards} />
      <RecordDetailModal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.productTitle || "Bid"}
        badges={badge ? [{ label: badge.label }] : undefined}
        fields={detail ? buildBidDetailFields(detail, "buyer") : undefined}
        footer={
          detail ? (
            <>
              {/* The full page — a modal cannot be linked, bookmarked or
                  reloaded into, which is the whole reason the page exists. */}
              <TextLink href={String(ROUTES.USER.BID_DETAIL(detail.id))}>
                Open full page →
              </TextLink>
              <TextLink href={String(ROUTES.PUBLIC.COLLECTOR_DROP_DETAIL(detail.productId))}>
                View collector drop →
              </TextLink>
            </>
          ) : undefined
        }
      />
    </>
  );
}
