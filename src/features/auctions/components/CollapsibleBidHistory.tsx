"use client";

import React, { useState } from "react";
import { BidHistory } from "../../products/components/BidHistory";
import type { BidHistoryEntry } from "../../products/components/BidHistory";

interface CollapsibleBidHistoryProps {
  bids: BidHistoryEntry[];
  currency: string;
}

export function CollapsibleBidHistory({ bids, currency }: CollapsibleBidHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Bid History
          {bids.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 normal-case tracking-normal">
              {bids.length}
            </span>
          )}
        </span>
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
        <div className="px-4 py-4 bg-white dark:bg-zinc-900">
          <BidHistory
            bids={bids}
            isEmpty={bids.length === 0}
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}
