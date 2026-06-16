"use client";

import React, { useState } from "react";
import { Div, Span } from "../../../ui";
import { BidHistory } from "../../products/components/BidHistory";
import type { BidHistoryEntry } from "../../products/components/BidHistory";

const __O = {
  hidden: "overflow-hidden",
} as const;

interface CollapsibleBidHistoryProps {
  bids: BidHistoryEntry[];
  currency: string;
}

export function CollapsibleBidHistory({ bids, currency }: CollapsibleBidHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <Div className={`mt-6 ${__O.hidden}`} border="subtle" rounded="xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
        aria-expanded={open}
      >
        <Span size="sm" weight="semibold" className="tracking-wide" color="muted" transform="uppercase">
          Bid History
          {bids.length > 0 && (
            <Span size="xs" weight="medium" className="ml-2 normal-case tracking-normal" rounded="full" padding="pill-xs" surface="subtle" color="muted">
              {bids.length}
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
      </button>

      {open && (
        <Div surface="default" className="px-4" padding="y-md">
          <BidHistory
            bids={bids}
            isEmpty={bids.length === 0}
            currency={currency}
          />
        </Div>
      )}
    </Div>
  );
}
