"use client";
import React, { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Div, Row, Text, Badge } from "../../../ui";
import type { BidDocument } from "../schemas/firestore";

function paise(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function relDate(d: Date | string) {
  const ms = new Date(d).getTime();
  if (isNaN(ms)) return "";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_VARIANT: Record<string, "active" | "pending" | "danger" | "info"> = {
  active:    "active",
  won:       "active",
  outbid:    "pending",
  lost:      "info",
  cancelled: "danger",
};

export interface AuctionWithBids {
  productId: string;
  productTitle: string;
  bids: BidDocument[];
}

export interface AuctionBidsTableProps {
  bids: BidDocument[];
  portal?: "buyer" | "store" | "admin";
  emptyLabel?: React.ReactNode;
}

function groupByAuction(bids: BidDocument[]): AuctionWithBids[] {
  const map = new Map<string, AuctionWithBids>();
  for (const bid of bids) {
    if (!map.has(bid.productId)) {
      map.set(bid.productId, {
        productId: bid.productId,
        productTitle: bid.productTitle,
        bids: [],
      });
    }
    map.get(bid.productId)!.bids.push(bid);
  }
  return Array.from(map.values());
}

function AuctionRow({
  auction,
  portal,
}: {
  auction: AuctionWithBids;
  portal: "buyer" | "store" | "admin";
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () => [...auction.bids].sort((a, b) => b.bidAmount - a.bidAmount),
    [auction.bids],
  );
  const highest = sorted[0]?.bidAmount ?? 0;
  const isWinning = auction.bids.some((b) => b.isWinning);

  return (
    <Div className="border border-[var(--appkit-color-border)] rounded-xl overflow-hidden bg-[var(--appkit-color-surface)] shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--appkit-color-border-subtle)] transition-colors text-left"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`shrink-0 text-[var(--appkit-color-text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`}
          size={16}
        />
        <Div className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-[var(--appkit-color-text)] line-clamp-1">
            {auction.productTitle}
          </Text>
        </Div>
        <Row gap="sm" className="shrink-0 items-center">
          {isWinning && (
            <Badge variant="active">Winning</Badge>
          )}
          <Text variant="secondary" className="text-xs">
            {auction.bids.length} bid{auction.bids.length !== 1 ? "s" : ""}
          </Text>
          <Text className="text-sm font-semibold text-[var(--appkit-color-text)]">
            {paise(highest)}
          </Text>
        </Row>
      </button>

      {expanded && (
        <Div className="border-t border-[var(--appkit-color-border)]">
          <div
            className="grid text-xs font-medium text-[var(--appkit-color-text-muted)] uppercase tracking-wide px-4 py-2 border-b border-[var(--appkit-color-border-subtle)]"
            style={{ gridTemplateColumns: portal === "buyer" ? "1fr auto auto" : "1fr 1fr auto auto" }}
          >
            <span>{portal === "buyer" ? "Amount" : "Bidder"}</span>
            {portal !== "buyer" && <span>Amount</span>}
            <span>Status</span>
            <span className="text-right">Time</span>
          </div>
          {sorted.map((bid) => (
            <div
              key={bid.id}
              className="grid items-center px-4 py-2.5 border-b border-[var(--appkit-color-border-subtle)] last:border-0 hover:bg-[var(--appkit-color-border-subtle)] transition-colors"
              style={{ gridTemplateColumns: portal === "buyer" ? "1fr auto auto" : "1fr 1fr auto auto" }}
            >
              {portal !== "buyer" && (
                <Text className="text-sm text-[var(--appkit-color-text)] truncate pr-3">
                  {bid.userName || bid.userId}
                </Text>
              )}
              <Text className="text-sm font-medium text-[var(--appkit-color-text)]">
                {paise(bid.bidAmount)}
              </Text>
              <Badge variant={STATUS_VARIANT[bid.status] ?? "pending"} className="capitalize">
                {bid.status}
              </Badge>
              <Text variant="secondary" className="text-xs text-right">
                {relDate(bid.bidDate)}
              </Text>
            </div>
          ))}
        </Div>
      )}
    </Div>
  );
}

export function AuctionBidsTable({
  bids,
  portal = "buyer",
  emptyLabel = "No bids found.",
}: AuctionBidsTableProps) {
  const auctions = useMemo(() => groupByAuction(bids), [bids]);

  if (auctions.length === 0) {
    return (
      <Div className="py-24 text-center">
        <Text variant="secondary">{emptyLabel}</Text>
      </Div>
    );
  }

  return (
    <Div className="space-y-3">
      {auctions.map((auction) => (
        <AuctionRow key={auction.productId} auction={auction} portal={portal} />
      ))}
    </Div>
  );
}
