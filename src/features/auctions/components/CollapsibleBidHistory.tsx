"use client";

import React, { useState } from "react";
import { Button, Div, Span } from "../../../ui";
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
      </Button>

      {open && (
        <Div surface="default" padding="md">
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
