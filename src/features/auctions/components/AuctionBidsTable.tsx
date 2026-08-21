"use client";
import React, { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge, Button, Div, Row, Span, Stack, Text, TextLink } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { CART_LANE } from "../../../_internal/shared/checkout/lanes";
import { Pagination } from "../../../ui/components/Pagination";
import type { BidDocument } from "../schemas/firestore";

const __O = {
  hidden: "overflow-hidden",
} as const;

function formatBidAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
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
  /** Server-side pagination — the auction groups shown are already just the
   *  current page's worth of bids grouped by auction, not the full history. */
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
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
  // Most-recent bid first — matches the caller's own newest-first ordering
  // (see UserBidsPage) instead of re-sorting by amount, which silently threw
  // that ordering away for the expanded per-auction row list.
  const sorted = useMemo(
    () => [...auction.bids].sort((a, b) => +new Date(b.bidDate) - +new Date(a.bidDate)),
    [auction.bids],
  );
  const highest = auction.bids.reduce((max, b) => Math.max(max, b.bidAmount), 0);
  const isWinning = auction.bids.some((b) => b.isWinning);

  return (
    <Div className={`border border-[var(--appkit-color-border)] ${__O.hidden} bg-[var(--appkit-color-surface)]`} rounded="xl" shadow="sm">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setExpanded((v) => !v)}
        gap="lg"
        paddingX="md"
        paddingY="md"
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`shrink-0 text-[var(--appkit-color-text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`}
          size={16}
        />
        <Div className="flex-1 min-w-0">
          <Text className="text-[var(--appkit-color-text)] line-clamp-1" size="sm" weight="semibold">
            {auction.productTitle}
          </Text>
        </Div>
        <Row gap="sm" className="shrink-0">
          {isWinning && (
            <Badge variant="active">Winning</Badge>
          )}
          <Text variant="secondary" size="xs">
            {auction.bids.length} bid{auction.bids.length !== 1 ? "s" : ""}
          </Text>
          <Text className="text-[var(--appkit-color-text)]" size="sm" weight="semibold">
            {formatBidAmount(highest)}
          </Text>
        </Row>
      </Button>

      {expanded && (
        <Div className="border-t border-[var(--appkit-color-border)]">
          <Div
            textSize="xs"
            textWeight="medium"
            paddingX="x-md"
            paddingY="y-xs"
            className={`grid text-[var(--appkit-color-text-muted)] uppercase tracking-wide border-b border-[var(--appkit-color-border-subtle)] ${portal === "buyer" ? "[grid-template-columns:1fr_auto_auto]" : "[grid-template-columns:1fr_1fr_auto_auto]"}`}
          >
            <Span>{portal === "buyer" ? "Amount" : "Bidder"}</Span>
            {portal !== "buyer" && <Span>Amount</Span>}
            <Span>Status</Span>
            <Span className="text-right">Time</Span>
          </Div>
          {sorted.map((bid) => (
            <Div
              key={bid.id}
              layout="grid"
              align="center"
              paddingX="x-md"
              paddingY="y-xs-tall"
              className={`border-b border-[var(--appkit-color-border-subtle)] last:border-0 hover:bg-[var(--appkit-color-border-subtle)] transition-colors ${portal === "buyer" ? "[grid-template-columns:1fr_auto_auto]" : "[grid-template-columns:1fr_1fr_auto_auto]"}`}
            >
              {portal !== "buyer" && (
                <Text className="text-[var(--appkit-color-text)] truncate pr-[0.75rem]" size="sm">
                  {bid.userName || bid.userId}
                </Text>
              )}
              <Text className="text-[var(--appkit-color-text)]" size="sm" weight="medium">
                {formatBidAmount(bid.bidAmount)}
              </Text>
              <Badge variant={STATUS_VARIANT[bid.status] ?? "pending"} className="capitalize">
                {bid.status}
              </Badge>
              <Stack gap="xs" align="end">
                <Text variant="secondary" size="xs" align="end">
                  {relDate(bid.bidDate)}
                </Text>
                {/* A "Won" badge with nothing to click is a dead end (Root
                    Cause #56). A win that hasn't been paid for yet links into
                    the auction checkout lane; once `orderId` is set the win is
                    settled and links to the order instead. */}
                {portal === "buyer" && bid.status === "won" && (
                  <TextLink
                    href={
                      bid.orderId
                        ? String(ROUTES.USER.ORDER_DETAIL(bid.orderId))
                        : `${String(ROUTES.USER.CHECKOUT)}?lane=${CART_LANE.AUCTION}`
                    }
                    size="xs"
                    weight="semibold"
                  >
                    {bid.orderId ? "View order" : "Pay now →"}
                  </TextLink>
                )}
              </Stack>
            </Div>
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
  totalPages,
  currentPage,
  onPageChange,
}: AuctionBidsTableProps) {
  const auctions = useMemo(() => groupByAuction(bids), [bids]);

  if (auctions.length === 0) {
    return (
      <Div padding="y-6xl" className="text-left">
        <Text variant="secondary">{emptyLabel}</Text>
      </Div>
    );
  }

  return (
    <Stack gap="3">
      {auctions.map((auction) => (
        <AuctionRow key={auction.productId} auction={auction} portal={portal} />
      ))}
      {totalPages !== undefined && totalPages > 1 && currentPage !== undefined && onPageChange && (
        <Row justify="center">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </Row>
      )}
    </Stack>
  );
}
