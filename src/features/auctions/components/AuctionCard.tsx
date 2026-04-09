import React, { useState, useEffect } from "react";
import type { AuctionItem } from "../types";
import { Article, Button, Heading, Span, Text } from "@mohasinac/ui";

interface AuctionCountdownProps {
  endsAt: string;
  className?: string;
  labels?: { ended?: string; hours?: string; mins?: string; secs?: string };
}

function useCountdown(endsAt: string) {
  const [msLeft, setMsLeft] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(new Date(endsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (msLeft <= 0) return null;
  const totalSecs = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return { h, m, s };
}

export function AuctionCountdown({
  endsAt,
  className = "",
  labels = {},
}: AuctionCountdownProps) {
  const countdown = useCountdown(endsAt);

  if (!countdown) {
    return (
      <Span className={`text-sm font-medium text-red-600 ${className}`}>
        {labels.ended ?? "Ended"}
      </Span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={`flex items-center gap-1 text-sm font-mono ${className}`}>
      <Span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">
        {pad(countdown.h)}
      </Span>
      <Span className="text-gray-400">:</Span>
      <Span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">
        {pad(countdown.m)}
      </Span>
      <Span className="text-gray-400">:</Span>
      <Span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">
        {pad(countdown.s)}
      </Span>
    </div>
  );
}

interface AuctionCardProps {
  auction: AuctionItem;
  labels?: {
    currentBid?: string;
    startingBid?: string;
    bids?: string;
    placeBid?: string;
    ended?: string;
  };
  onBid?: (auction: AuctionItem) => void;
  className?: string;
}

export function AuctionCard({
  auction,
  labels = {},
  onBid,
  className = "",
}: AuctionCardProps) {
  const hasEnded = new Date(auction.auctionEndDate) <= new Date();
  const displayBid = auction.currentBid ?? auction.startingBid;

  return (
    <Article
      className={`rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {auction.mainImage && (
        <div className="aspect-square overflow-hidden relative">
          <div
            role="img"
            aria-label={auction.title}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${auction.mainImage})` }}
          />
          <Span className="absolute top-2 left-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
            AUCTION
          </Span>
        </div>
      )}
      <div className="p-4">
        <Heading
          level={3}
          className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2"
        >
          {auction.title}
        </Heading>

        <div className="flex items-center justify-between mb-2">
          <div>
            <Text className="text-xs text-gray-400">
              {labels.currentBid ?? "Current bid"}
            </Text>
            <Text className="text-base font-bold text-gray-900">
              {auction.currency} {displayBid.toLocaleString()}
            </Text>
          </div>
          <div className="text-right">
            <Text className="text-xs text-gray-400">
              {auction.bidCount} {labels.bids ?? "bids"}
            </Text>
          </div>
        </div>

        <div className="mb-3">
          <AuctionCountdown
            endsAt={auction.auctionEndDate}
            labels={{ ended: labels.ended }}
          />
        </div>

        {!hasEnded && onBid && (
          <Button
            type="button"
            variant="warning"
            onClick={() => onBid(auction)}
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            {labels.placeBid ?? "Place Bid"}
          </Button>
        )}
      </div>
    </Article>
  );
}
