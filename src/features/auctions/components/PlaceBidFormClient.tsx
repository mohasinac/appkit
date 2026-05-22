"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "../../../utils/number.formatter";
import { isAuthError } from "../../../utils/auth-error";
import { Button, Div, Input, LoginRequiredModal, Modal, Row, Span, Stack, Text } from "../../../ui";

const BID_ERROR_DISPLAY: Record<string, string> = {
  BID_AUCTION_ENDED: "This auction has closed. No more bids are accepted.",
  BID_AMOUNT_TOO_LOW: "Your bid must exceed the current winning bid.",
  BID_INCREMENT_TOO_LOW: "Your bid does not meet the minimum increment requirement.",
  BID_SELF_BID: "You cannot bid on your own listing.",
  BID_USER_BANNED: "Your account is currently restricted from bidding. Contact support.",
};

export interface PlaceBidInput {
  productId: string;
  bidAmount: number;
  autoMaxBid?: number;
}

export interface PlaceBidFormClientProps {
  productId: string;
  currentBid: number;
  startingBid: number;
  minBidIncrement: number;
  currency: string;
  isEnded: boolean;
  buyNowPrice: number | null;
  bidsHaveStarted?: boolean;
  bidCount: number;
  tags?: string[];
  onPlaceBid: (input: PlaceBidInput) => Promise<unknown>;
  onBuyNow?: () => Promise<unknown>;
}

export function PlaceBidFormClient({
  productId,
  currentBid,
  startingBid,
  minBidIncrement,
  currency,
  isEnded,
  buyNowPrice,
  bidsHaveStarted = false,
  bidCount,
  tags = [],
  onPlaceBid,
  onBuyNow,
}: PlaceBidFormClientProps) {
  const minBid = currentBid + minBidIncrement;
  const [bidAmount, setBidAmount] = useState<string>(String(minBid));
  const [isPending, startTransition] = useTransition();
  const [isBuyNowPending, startBuyNowTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const buyNowAvailable = buyNowPrice !== null && !isEnded && !bidsHaveStarted && !!onBuyNow;

  function handleBuyNow() {
    if (!onBuyNow) return;
    setError(null);
    setSuccess(false);
    startBuyNowTransition(async () => {
      try {
        const result = await onBuyNow();
        if (
          result &&
          typeof result === "object" &&
          "ok" in result &&
          (result as { ok: boolean }).ok === false
        ) {
          const r = result as { error?: string };
          setError(r.error ?? "Buy Now failed. Please try again.");
          return;
        }
        setSuccess(true);
      } catch (err: unknown) {
        if (isAuthError(err)) {
          setShowLoginModal(true);
        } else {
          setError(err instanceof Error ? err.message : "Buy Now failed. Please try again.");
        }
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(bidAmount);
    if (!amount || amount < minBid) {
      setError(`Bid must be at least ${formatCurrency(minBid, currency)}`);
      return;
    }
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const result = await onPlaceBid({ productId, bidAmount: amount });
        if (
          result &&
          typeof result === "object" &&
          "ok" in result &&
          (result as { ok: boolean }).ok === false
        ) {
          const r = result as { error?: string; code?: string };
          const display = (r.code && BID_ERROR_DISPLAY[r.code]) ?? r.error ?? "Failed to place bid. Please try again.";
          setError(display);
          return;
        }
        setSuccess(true);
        setBidAmount(String(amount + minBidIncrement));
      } catch (err: unknown) {
        if (isAuthError(err)) {
          setShowLoginModal(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to place bid. Please try again.");
        }
      }
    });
  }

  return (
    <Div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 space-y-4">
      {/* Current / starting bid summary */}
      <Div className="space-y-1">
        <Row justify="between" align="center">
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">Current bid</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">Starting bid</Text>
        </Row>
        <Row justify="between" align="baseline">
          <Span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(currentBid, currency)}
          </Span>
          <Span className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatCurrency(startingBid, currency)}
          </Span>
        </Row>
        <Text className="text-xs text-zinc-400 dark:text-zinc-500">
          {bidCount} {bidCount === 1 ? "bid" : "bids"} · min increment{" "}
          {formatCurrency(minBidIncrement, currency)}
        </Text>
      </Div>

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to place a bid. Please log in or create an account to continue."
      />

      {/* Bid form */}
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <Input
            type="number"
            value={bidAmount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setBidAmount(e.target.value)
            }
            placeholder={`At least ${formatCurrency(minBid, currency)}`}
            min={minBid}
            step={minBidIncrement}
            aria-label="Your bid amount"
            disabled={isEnded || isPending}
          />

          {error && (
            <Text className="text-xs text-red-600 dark:text-red-400">{error}</Text>
          )}
          {success && (
            <Text className="text-xs text-emerald-600 dark:text-emerald-400">
              ✓ Bid placed successfully!
            </Text>
          )}

          <Button
            variant="primary"
            size="md"
            className="w-full"
            disabled={isEnded || isPending}
            type="submit"
          >
            {isPending ? "Placing Bid…" : isEnded ? "Auction Ended" : "Place Bid"}
          </Button>

          {buyNowAvailable && (
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              type="button"
              disabled={isBuyNowPending || isPending}
              onClick={handleBuyNow}
            >
              {isBuyNowPending ? "Processing…" : `Buy Now — ${formatCurrency(buyNowPrice!, currency)}`}
            </Button>
          )}
        </Stack>
      </form>

      {/* Tags */}
      {tags.length > 0 && (
        <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <Row wrap gap="xs">
            {tags.map((tag) => (
              <Span
                key={tag}
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300"
              >
                {tag}
              </Span>
            ))}
          </Row>
        </Div>
      )}
    </Div>
  );
}

/**
 * `PlaceBidModalButton` — opens a modal that hosts the same PlaceBidFormClient.
 *
 * Use this on listing-detail pages so buyers explicitly opt-in to the bid
 * surface instead of always seeing the card inline.
 */
export function PlaceBidModalButton(props: PlaceBidFormClientProps & { triggerLabel?: string; triggerClassName?: string }) {
  const { triggerLabel = "Place a bid", triggerClassName = "", ...formProps } = props;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size="md"
        className={triggerClassName}
        disabled={props.isEnded}
        onClick={() => setOpen(true)}
      >
        {props.isEnded ? "Auction Ended" : triggerLabel}
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} size="md" title="Place your bid">
        <PlaceBidFormClient {...formProps} />
      </Modal>
    </>
  );
}
