"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "../../../utils/number.formatter";
import { isAuthError } from "../../../utils/auth-error";
import { Button, Div, LoginRequiredModal, Modal, Row, Span, Stack, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { applyZodIssues } from "../../../ui/forms/FormShell";
import { placeBidSchema } from "../schemas/bid-input";

import { normalizeError } from "../../../errors/normalize";
const __P = {
  p5: "p-5",
} as const;

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
  const [stepMul, setStepMul] = useState<1 | 5 | 10 | "custom">(1);
  const [isPending, startTransition] = useTransition();
  const [isBuyNowPending, startBuyNowTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  function applyPreset(n: 1 | 5 | 10) {
    setStepMul(n);
    setBidAmount(String(currentBid + minBidIncrement * n));
  }

  const buyNowAvailable = buyNowPrice !== null && !isEnded && !bidsHaveStarted && !!onBuyNow;
  const schema = placeBidSchema(minBid, minBidIncrement);

  async function submitBid(
    amount: number,
    setFieldError: (name: string, error: string | null) => void,
  ) {
    try {
      const result = await onPlaceBid({ productId, bidAmount: amount });
      const errorMsg = bidErrorMessage(result);
      if (errorMsg) {
        setFieldError("bidAmount", errorMsg);
        return;
      }
      setSuccess(true);
      setBidAmount(String(amount + minBidIncrement));
      setStepMul(1);
    } catch (err: unknown) {
      void normalizeError(err);
      if (isAuthError(err)) {
        setShowLoginModal(true);
      } else {
        setFieldError(
          "bidAmount",
          err instanceof Error ? err.message : "Failed to place bid. Please try again.",
        );
      }
    }
  }

  function bidErrorMessage(result: unknown): string | null {
    if (!result || typeof result !== "object" || !("ok" in result)) return null;
    const r = result as { ok: boolean; error?: string; code?: string };
    if (r.ok !== false) return null;
    return (r.code && BID_ERROR_DISPLAY[r.code]) ?? r.error ?? "Failed to place bid. Please try again.";
  }

  function handleBuyNow() {
    if (!onBuyNow) return;
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
          setSuccess(false);
          return;
        }
        setSuccess(true);
      } catch (err: unknown) {
        void normalizeError(err);
        if (isAuthError(err)) setShowLoginModal(true);
      }
    });
  }

  return (
    <Div className={`border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 ${__P.p5} space-y-4`} rounded="xl" surface="muted">
      {/* Current / starting bid summary */}
      <Stack gap="xs">
        <Row justify="between" align="center">
          <Text size="xs" color="muted">Current bid</Text>
          <Text size="xs" color="muted">Starting bid</Text>
        </Row>
        <Row justify="between" align="baseline">
          <Span size="xl" weight="bold" className="text-primary-600 dark:text-primary-400">
            {formatCurrency(currentBid, currency)}
          </Span>
          <Span size="sm" color="muted">
            {formatCurrency(startingBid, currency)}
          </Span>
        </Row>
        <Text size="xs" color="faint">
          {bidCount} {bidCount === 1 ? "bid" : "bids"} · min increment{" "}
          {formatCurrency(minBidIncrement, currency)}
        </Text>
      </Stack>

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to place a bid. Please log in or create an account to continue."
      />

      <Form
        onSubmit={(e) => {
          // handler wired through render-prop below — keeps setFieldError in scope
          e.preventDefault();
        }}
      >
        {({ setFieldError, clearErrors }) => (
          <Stack gap="sm">
            <Row gap="xs" wrap role="radiogroup" aria-label="Bid amount preset">
              {([1, 5, 10] as const).map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={stepMul === n ? "primary" : "secondary"}
                  size="sm"
                  role="radio"
                  aria-checked={stepMul === n}
                  disabled={isEnded || isPending}
                  onClick={() => {
                    clearErrors();
                    applyPreset(n);
                  }}
                >
                  +{formatCurrency(minBidIncrement * n, currency)}
                </Button>
              ))}
              <Button
                type="button"
                variant={stepMul === "custom" ? "primary" : "ghost"}
                size="sm"
                role="radio"
                aria-checked={stepMul === "custom"}
                disabled={isEnded || isPending}
                onClick={() => setStepMul("custom")}
              >
                Custom
              </Button>
            </Row>

            <FieldInput
              name="bidAmount"
              type="number"
              value={bidAmount}
              readOnly={stepMul !== "custom"}
              onChange={(value) => {
                setBidAmount(value);
                clearErrors();
              }}
              placeholder={`At least ${formatCurrency(minBid, currency)}`}
              min={minBid}
              aria-label="Your bid amount"
              disabled={isEnded || isPending}
            />
            {stepMul === "custom" && (
              <Text size="xs" color="muted" aria-live="polite">
                Any amount ≥ {formatCurrency(minBid, currency)} is accepted.
              </Text>
            )}

            {success && (
              <Text className="text-success" size="xs">
                ✓ Bid placed successfully!
              </Text>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={isEnded || isPending}
              isLoading={isPending}
              type="button"
              onClick={() => {
                clearErrors();
                const parsed = schema.safeParse({ bidAmount });
                if (!parsed.success) return applyZodIssues(parsed.error.issues, setFieldError);
                setSuccess(false);
                startTransition(() => submitBid(parsed.data.bidAmount, setFieldError));
              }}
            >
              {isEnded ? "Auction Ended" : "Place Bid"}
            </Button>

            {buyNowAvailable && (
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                type="button"
                disabled={isBuyNowPending || isPending}
                isLoading={isBuyNowPending}
                onClick={handleBuyNow}
              >
                {`Buy Now — ${formatCurrency(buyNowPrice!, currency)}`}
              </Button>
            )}
          </Stack>
        )}
      </Form>

      {/* Tags */}
      {tags.length > 0 && (
        <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <Row wrap gap="xs">
            {tags.map((tag) => (
              <Span
                key={tag}
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1" color="muted" size="xs"
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
