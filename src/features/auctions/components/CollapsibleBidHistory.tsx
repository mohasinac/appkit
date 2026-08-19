"use client";

import React, { useState } from "react";
import { Button, Div, Row, Span } from "../../../ui";
import { Pagination } from "../../../ui/components/Pagination";
import { BidHistory } from "../../products/components/BidHistory";
import type { BidHistoryEntry } from "../../products/components/BidHistory";
import { useBids, type BidListResponse } from "../hooks/useBids";

const __O = {
  hidden: "overflow-hidden",
} as const;

interface RawBidLike {
  id?: unknown;
  userId?: unknown;
  bidderId?: unknown;
  userName?: unknown;
  bidderName?: unknown;
  bidAmount?: unknown;
  amount?: unknown;
  bidDate?: unknown;
  createdAt?: unknown;
  bidAt?: unknown;
}

/** Shared shape mapper — SSR's raw bid docs and useBids()'s client-fetched
 *  pages both go through this so every page (SSR page 1, client pages 2+)
 *  renders identically. */
export function toBidHistoryEntry(b: RawBidLike): BidHistoryEntry {
  return {
    id: String(b.id ?? ""),
    bidderId: String(b.userId ?? b.bidderId ?? ""),
    bidderName: (b.bidderName ?? b.userName) as string | undefined,
    amount: typeof b.bidAmount === "number" ? b.bidAmount : typeof b.amount === "number" ? b.amount : 0,
    placedAt: (b.bidDate ?? b.createdAt ?? b.bidAt ?? "") as string,
  };
}

interface CollapsibleBidHistoryProps {
  productId: string;
  /** SSR page-1 result — seeds `useBids()`'s cache so opening the section
   *  doesn't trigger a redundant fetch for the page already rendered. */
  initialData: BidListResponse;
  currency: string;
  pageSize?: number;
}

export function CollapsibleBidHistory({ productId, initialData, currency, pageSize = 5 }: CollapsibleBidHistoryProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { bids: rawBids, totalPages, isLoading } = useBids(
    { productId, page, pageSize },
    { initialData, enabled: open },
  );
  const bids = rawBids.map(toBidHistoryEntry);
  const total = initialData.total;

  return (
    <Div className={`mt-6 ${__O.hidden}`} border="subtle" rounded="xl">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        paddingX="md"
        paddingY="md"
        rounded="none"
        className="w-full justify-between bg-[var(--appkit-color-surface)]/60 hover:bg-[var(--appkit-color-surface-elevated)]"
        aria-expanded={open}
      >
        <Span size="sm" weight="semibold" className="tracking-wide" color="muted" transform="uppercase">
          Bid History
          {total > 0 && (
            <Span size="xs" weight="medium" className="ml-2 normal-case tracking-normal" rounded="full" padding="pill-xs" surface="subtle" color="muted">
              {total}
            </Span>
          )}
        </Span>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {open && (
        <Div surface="default" padding="md">
          <BidHistory
            bids={bids}
            isLoading={isLoading && bids.length === 0}
            isEmpty={!isLoading && bids.length === 0}
            currency={currency}
          />
          {totalPages > 1 && (
            <Row justify="center" className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} size="sm" />
            </Row>
          )}
        </Div>
      )}
    </Div>
  );
}
