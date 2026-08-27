"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "../../../utils/number.formatter";
import { isAuthError } from "../../../utils/auth-error";
import { Button, CountdownDisplay, Div, LoginRequiredModal, Modal, Row, Span, Stack, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { placeBidSchema } from "../schemas/bid-input";
import { useLiveAuctionBid } from "../hooks/useLiveAuctionBid";
import { AUCTION_BUYOUT_WINDOW_MINUTES } from "../../../_internal/shared/checkout/lanes";
import {
  BID_PRESET_MULTIPLIERS,
  isBuyNowAvailable,
  resolveMinBid,
  resolveMinBidIncrement,
  type BidIncrementTier,
  type BidPresetMultiplier,
} from "../../../_internal/shared/features/auctions/config";

import { normalizeError } from "../../../errors/normalize";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
const __P = {
  p5: "p-[var(--appkit-space-5)]",
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

/**
 * The `ActionResult` envelope every server action in this app returns.
 *
 * 🛑 Exactly ONE level. `onPlaceBid`/`onBuyNow` used to be typed
 * `Promise<unknown>`, and the consumer's actions returned a *doubly*-wrapped
 * `{ ok: true, data: { ok: false, error } }`. Reading the outer `ok` therefore
 * saw `true` for every possible outcome — including every failure — so Buy Now
 * placed a real bid and a real locked cart line and then silently
 * `router.refresh()`ed a page that renders nothing from the cart. Typing these
 * props is what makes a re-introduced second envelope a compile error rather
 * than a silent no-op button.
 */
export type BidActionEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; issues?: unknown[] };

/** The subset of `BuyNowAuctionResult` this component actually consumes. */
export interface BuyNowSuccess {
  checkoutUrl?: string;
}

export interface PlaceBidFormClientProps {
  productId: string;
  currentBid: number;
  startingBid: number;
  tiers: BidIncrementTier[];
  minBidIncrementOverride?: number;
  currency: string;
  isEnded: boolean;
  auctionEndDate: Date | null;
  buyNowPrice: number | null;
  bidCount: number;
  tags?: string[];
  onPlaceBid: (input: PlaceBidInput) => Promise<BidActionEnvelope<unknown>>;
  onBuyNow?: () => Promise<BidActionEnvelope<BuyNowSuccess>>;
}

export function PlaceBidFormClient({
  productId,
  currentBid: ssrCurrentBid,
  startingBid,
  tiers,
  minBidIncrementOverride,
  currency,
  isEnded,
  auctionEndDate,
  buyNowPrice,
  bidCount: ssrBidCount,
  tags = [],
  onPlaceBid,
  onBuyNow,
}: PlaceBidFormClientProps) {
  const router = useRouter();
  // Live-updates while the bid card is open — reflects other bidders'
  // activity on this auction, not just the bidder's own submission.
  const live = useLiveAuctionBid(productId, ssrCurrentBid, ssrBidCount, { enabled: !isEnded });
  const currentBid = live.currentBid;
  const bidCount = live.bidCount;
  // Tiered, floor-raising: resolves fresh whenever the live current bid
  // crosses a tier boundary while this modal is open.
  const minBidIncrement = resolveMinBidIncrement(currentBid, tiers, minBidIncrementOverride);
  // Mirrors `placeBid`'s own `hasBids`. The `currentBid` prop already falls
  // back to `startingBid` when the auction has no bids, so it can't be tested
  // for `> 0` the way the server tests the raw document field — `bidCount`, or
  // a price that has moved past the opening one, is the equivalent signal.
  const hasBids = bidCount > 0 || currentBid > startingBid;
  // Same helper `placeBid` uses server-side, so the seeded amount below can
  // never be one the server rejects.
  const minBid = resolveMinBid(currentBid, tiers, minBidIncrementOverride, { hasBids });
  const [bidAmount, setBidAmount] = useState<string>(String(minBid));
  const [stepMul, setStepMul] = useState<BidPresetMultiplier | "custom">(BID_PRESET_MULTIPLIERS[0]);
  const [isPending, startTransition] = useTransition();
  const [isBuyNowPending, startBuyNowTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  /**
   * Buy Now has no field to hang an error off — it is a standalone button, not
   * a form input — so it needs its own slot. Without one, every domain failure
   * (`AUCTION_ENDED`, `BUY_NOW_UNAVAILABLE`, rate-limit) was silent.
   */
  const [buyNowError, setBuyNowError] = useState<string | null>(null);
  /** Last amount the form itself wrote — see `seedAmount` below. */
  const lastSeeded = useRef(minBid);

  /**
   * The bid a given preset multiplier resolves to at the live price.
   *
   * Anchored on `minBid` rather than `currentBid` so the first preset is always
   * exactly the minimum acceptable bid. With bids present that is identical to
   * the old `currentBid + increment * n`; with none it makes the opening preset
   * the starting bid itself instead of an amount the seller never asked for.
   */
  function presetAmount(n: BidPresetMultiplier) {
    return minBid + minBidIncrement * (n - 1);
  }

  /**
   * Write an amount the FORM chose (not the buyer). Tracking these separately
   * from buyer keystrokes is what lets the live-price effect below tell "this
   * value is still ours to update" from "the buyer typed this".
   */
  function seedAmount(value: number) {
    lastSeeded.current = value;
    setBidAmount(String(value));
  }

  function applyPreset(n: BidPresetMultiplier) {
    setStepMul(n);
    seedAmount(presetAmount(n));
  }

  // Re-seed the amount whenever the live price moves under a preset selection.
  //
  // `bidAmount` was previously only ever written on mount or on click, but
  // `currentBid` keeps updating from the `/auction-bids/{id}` SSE channel while
  // this form is open. A buyer who opened the modal, sat on it while another
  // bidder moved the price, then hit "Place Bid" was submitting an amount now
  // below the minimum — a guaranteed BID_AMOUNT_TOO_LOW rejection, with the
  // preset buttons above already relabelled to the new tier so the number in
  // the field visibly disagreed with the button that was highlighted.
  //
  // Custom is deliberately left alone: a typed amount is the buyer's own, and
  // the schema + `min` attribute already surface it if the price outran them.
  useEffect(() => {
    if (stepMul === "custom") return;
    const next = presetAmount(stepMul);
    if (String(next) === bidAmount) return;
    // Only follow the live price, never fight the buyer's own edits.
    if (bidAmount !== String(lastSeeded.current)) return;
    seedAmount(next);
    // presetAmount is derived from currentBid/minBidIncrement, both in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBid, minBidIncrement, stepMul]);

  // `currentBid` here is the LIVE SSE price, so the button hides itself the
  // moment another bidder passes the buyout price — without a page reload, and
  // without this component owning a second copy of the rule.
  const buyNowAvailable =
    isBuyNowAvailable({ buyNowPrice, currentBid, isEnded }) && !!onBuyNow;
  const schema = placeBidSchema(minBid, formatCurrency(minBid, currency));

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
      // Provisional next-bid seed, corrected by the live-price effect above as
      // soon as the SSE tick for this bid lands. It is only provisional because
      // under proxy-bid semantics `placeBid` treats the submission as a MAXIMUM
      // — the resulting visible price is usually lower than `amount`, and if the
      // bid lost to a higher standing proxy cap it is higher. The old
      // `amount + increment` was therefore rarely the next valid bid; taking the
      // max against the live price keeps this from ever seeding below minimum.
      setStepMul(BID_PRESET_MULTIPLIERS[0]);
      seedAmount(resolveMinBid(Math.max(currentBid, amount), tiers, minBidIncrementOverride));
      // The bid history list and any duplicated static current-bid/bid-count
      // text elsewhere on this SSR'd page (info panel, page-level summary
      // cards) are frozen server props — refresh so they reflect this bid
      // immediately instead of waiting for the page's ISR window to roll
      // over. The live price shown above already updated via SSE regardless.
      router.refresh();
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

  function bidErrorMessage(result: BidActionEnvelope<unknown>): string | null {
    if (result.ok) return null;
    return (
      (result.code && BID_ERROR_DISPLAY[result.code]) ??
      result.error ??
      "Failed to place bid. Please try again."
    );
  }

  /**
   * Show a Buy Now failure.
   *
   * Every failure used to be indistinguishable from success and was discarded.
   * An auth failure never THROWS across a server-action boundary — it arrives
   * as a code — so `isAuthError` in the catch below could never fire for it.
   *
   * ONLY `UNAUTHENTICATED` (401) means "sign in". `FORBIDDEN` (403) is "signed
   * in, but not allowed" — bidding on your own auction, or an active
   * `place_bids` soft ban. A login prompt for those tells the buyer to fix
   * something that is not the problem.
   */
  function reportBuyNowFailure(code: string | undefined, message?: string) {
    if (code === "UNAUTHENTICATED") {
      setShowLoginModal(true);
      return;
    }
    setBuyNowError(
      (code && BID_ERROR_DISPLAY[code]) ??
        message ??
        "Buy Now failed. Please try again.",
    );
  }

  function handleBuyNow() {
    if (!onBuyNow) return;
    setSuccess(false);
    setBuyNowError(null);
    startBuyNowTransition(async () => {
      try {
        const result = await onBuyNow();
        if (!result.ok) {
          reportBuyNowFailure(result.code, result.error);
          return;
        }

        setSuccess(true);
        // Buy-Now writes a locked cart line, so send the buyer straight to the
        // auction checkout lane to pay for it. `buyNowAuction` deliberately
        // never touches the product document, so falling through to
        // `router.refresh()` re-renders a byte-identical page — which is
        // exactly what "the button does nothing" looked like.
        if (result.data.checkoutUrl) router.push(result.data.checkoutUrl);
        else router.refresh();
      } catch (err: unknown) {
        void normalizeError(err);
        reportBuyNowFailure(
          isAuthError(err) ? "UNAUTHENTICATED" : undefined,
          err instanceof Error ? err.message : undefined,
        );
      }
    });
  }

  return (
    <Stack className={`${__P.p5}`} border="subtle" gap="md" rounded="xl" surface="muted">
      {/* Current / starting bid summary */}
      <Stack gap="xs">
        <Row justify="between" align="center">
          {/* With no bids the big number IS the starting bid, so calling it
              "Current bid" next to an identical "Starting bid" read as a bug. */}
          <Text size="xs" color="muted">{hasBids ? "Current bid" : "Starting bid"}</Text>
          <Text size="xs" color="muted">{hasBids ? "Starting bid" : "Minimum bid"}</Text>
        </Row>
        <Row justify="between" align="baseline">
          <Span size="xl" weight="bold" className="text-primary-600 dark:text-primary-400">
            {formatCurrency(currentBid, currency)}
          </Span>
          <Span size="sm" color="muted">
            {formatCurrency(hasBids ? startingBid : minBid, currency)}
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

      <Form schema={schema}
        onSubmit={(e) => {
          // handler wired through render-prop below — keeps setFieldError in scope
          e.preventDefault();
        }}
      >
        {({ setFieldError, clearErrors, markSubmitAttempted }) => (
          <Stack gap="sm">
            <FormErrorSummary />
            {/*
              Steps are multiples of the EFFECTIVE minimum increment, never
              fixed rupee amounts — a ₹100 increment renders +₹100/+₹500/+₹1,000
              and a ₹1,000 increment renders +₹1,000/+₹5,000/+₹10,000. Each
              button also states the bid it produces so the step and the
              resulting amount can't be misread for one another.
            */}
            <Row gap="xs" wrap role="radiogroup" aria-label="Bid amount preset">
              {BID_PRESET_MULTIPLIERS.map((n) => {
                const amount = presetAmount(n);
                const delta = amount - currentBid;
                // `delta` is 0 only for the opening preset on a bid-free
                // auction, where the minimum IS the starting bid — "+₹0" would
                // read as a broken button, so name what it actually is.
                const stepLabel = delta > 0 ? `+${formatCurrency(delta, currency)}` : "Minimum";
                return (
                  <Button
                    key={n}
                    type="button"
                    variant={stepMul === n ? "primary" : "secondary"}
                    size="sm"
                    role="radio"
                    aria-checked={stepMul === n}
                    disabled={isEnded || isPending}
                    aria-label={
                      delta > 0
                        ? `Bid ${formatCurrency(amount, currency)} — ${formatCurrency(delta, currency)} above the current bid`
                        : `Bid ${formatCurrency(amount, currency)} — the minimum accepted bid`
                    }
                    onClick={() => {
                      clearErrors();
                      applyPreset(n);
                    }}
                  >
                    <Stack gap="none" align="center">
                      <Span size="xs" weight="semibold">
                        {stepLabel}
                      </Span>
                      <Span size="xs" color="muted">
                        {formatCurrency(amount, currency)}
                      </Span>
                    </Stack>
                  </Button>
                );
              })}
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
            <Text size="xs" color="muted" aria-live="polite">
              {stepMul === "custom"
                ? `Any amount from ${formatCurrency(minBid, currency)} up is accepted — it need not be an exact multiple of the increment.`
                : hasBids
                  ? `Minimum next bid ${formatCurrency(minBid, currency)} (current bid + ${formatCurrency(minBidIncrement, currency)} increment).`
                  : `Minimum opening bid ${formatCurrency(minBid, currency)} — the seller's starting bid. The ${formatCurrency(minBidIncrement, currency)} increment applies from the second bid on.`}
            </Text>

            {success && (
              <Text className="text-success" size="xs">
                ✓ Bid placed successfully!
              </Text>
            )}

            {!isEnded && auctionEndDate && (
              <Text align="center" size="xs" color="muted">
                Ends in <CountdownDisplay targetDate={auctionEndDate} format="auto" expiredLabel="Ended" />
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
                // type="button" — no native submit, so unhide the summary here.
                markSubmitAttempted();
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
              <>
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
                {buyNowError && (
                  <Text align="center" size="xs" variant="error" role="alert">
                    {buyNowError}
                  </Text>
                )}
                {/* The auction keeps running while the claim is held, so the
                    deadline is the whole point — saying "Buy Now" alone reads
                    as an instant purchase, which it deliberately is not. */}
                <Text align="center" size="xs" color="muted">
                  Skips the bidding. The auction stays live until you pay —
                  complete checkout within {AUCTION_BUYOUT_WINDOW_MINUTES} minutes.
                </Text>
              </>
            )}
          </Stack>
        )}
      </Form>

      {/* Tags */}
      {tags.length > 0 && (
        <Div border="default" className="border-t" padding="t-md">
          <Row wrap gap="xs">
            {tags.map((tag) => (
              <Span
                key={tag} rounded="full" padding="pill-sm-tall" surface="subtle" color="muted" size="xs"
              >
                {tag}
              </Span>
            ))}
          </Row>
        </Div>
      )}
    </Stack>
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
