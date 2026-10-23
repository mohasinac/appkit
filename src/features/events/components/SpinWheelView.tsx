"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ClaimCouponButton, Div, Heading, LoginRequiredModal, Row, Span, Stack, Text, useToast } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
// `DisplaySpinPrize`, not `SpinPrize` — see that type's note. A view typed
// against the stored shape makes `weight` (the odds) and `couponId` REQUIRED of
// every caller, which is how a public wheel came to be handed both.
import type { DisplaySpinPrize } from "../types";

import { SpinWheel } from "./SpinWheel";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
// audit-content-alignment-ok: self-contained circular spin-wheel game widget, all text centered under the wheel by design
const CLS_PRIZE_BOX = "rounded-xl border border-success bg-success-surface dark:border-success p-[var(--appkit-space-4)] text-center";
const CLS_PRIZE_TITLE = "mt-1 text-[length:var(--appkit-text-lg)] font-bold text-success dark:text-success";
const CLS_PRIZE_BODY = "mt-2 text-[length:var(--appkit-text-sm)] text-success dark:text-success";
// audit-content-alignment-ok: self-contained circular spin-wheel game widget, all text centered under the wheel by design
const CLS_ERROR_TEXT = "text-[length:var(--appkit-text-sm)] text-error dark:text-error text-center";

export interface SpinWheelViewProps {
  eventId: string;
  prizes: DisplaySpinPrize[];
  alreadyUsed?: boolean;
  initialPrizeId?: string;
  initialCouponCode?: string;
  windowStart?: string | Date | null;
  windowEnd?: string | Date | null;
  onSpin: (eventId: string) => Promise<{
    spinPrizeId?: string;
    spinPrizeTitle?: string;
    spinPrizeCouponCode?: string;
    reason?: string;
  }>;
  labels?: {
    heading?: string;
    spinButton?: string;
    spinningButton?: string;
    alreadySpun?: string;
    outsideWindow?: string;
    wonHeadline?: string;
    couponHint?: string;
    errorFallback?: string;
  };
}

const DEFAULT_LABELS: Required<NonNullable<SpinWheelViewProps["labels"]>> = {
  heading: "Spin the Wheel",
  spinButton: "Spin",
  spinningButton: "Spinning…",
  alreadySpun: "You've already used your spin for this event.",
  outsideWindow: "The spin window is not open.",
  wonHeadline: "You won:",
  couponHint: "Coupon code:",
  errorFallback: "Spin failed. Please try again.",
};


export function SpinWheelView({
  eventId,
  prizes,
  alreadyUsed,
  initialPrizeId,
  initialCouponCode,
  windowStart,
  windowEnd,
  onSpin,
  labels,
}: SpinWheelViewProps) {
  const l = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  const activePrizes = useMemo(
    () => prizes.filter((p) => p.isActive !== false),
    [prizes],
  );

  const [spinning, setSpinning] = useState(false);
  const [resultPrizeId, setResultPrizeId] = useState<string | undefined>(
    initialPrizeId,
  );
  const [resultCoupon, setResultCoupon] = useState<string | undefined>(
    initialCouponCode,
  );
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { showToast } = useToast();
  // Root translator (no namespace) — `toUserMessage` passes fully-qualified
  // `errors.codes.*` keys and resolves them itself, so a missing key degrades
  // to generic copy rather than throwing MISSING_MESSAGE at render time.
  const t = useTranslations();

  const now = Date.now();
  const startMs = windowStart ? new Date(windowStart).getTime() : null;
  const endMs = windowEnd ? new Date(windowEnd).getTime() : null;
  const inWindow =
    (startMs === null || now >= startMs) && (endMs === null || now <= endMs);

  const disabled = spinning || alreadyUsed || !inWindow || activePrizes.length === 0;

  const handleSpin = useCallback(async () => {
    if (disabled) return;
    setError(null);
    setSpinning(true);

    try {
      /*
       * 🛑 AWAIT FIRST, THEN LAND. The wheel idles while this resolves and
       * only afterwards animates to the segment it actually won.
       *
       * It used to start a 3.2s CSS animation on click, await the server, and
       * then reveal the prize after ANOTHER blind `setTimeout(3200)` — so the
       * real wait was `latency + 3200ms`, the wheel visibly stopped before the
       * prize appeared, and it never landed anywhere meaningful because the
       * keyframes always finished at 0deg mod 360.
       *
       * `<SpinWheel>` now calls `onSettled` when it has physically stopped,
       * which is what reveals the prize card — so the reveal is tied to the
       * animation actually ending rather than to a duration guessed twice.
       */
      const result = await onSpin(eventId);
      {
        if (result.spinPrizeId) {
          setResultPrizeId(result.spinPrizeId);
          setResultCoupon(result.spinPrizeCouponCode);
        } else {
          setSpinning(false);
          /*
           * A 2xx with no prize. The server now refuses with a real status and
           * code for every reason it knows (`reasonToHttp`), so reaching here
           * means the response was shaped unexpectedly rather than refused —
           * the generic fallback is the honest answer.
           */
          setError(l.errorFallback);
        }
      }
    } catch (err) {
      const e = normalizeError(err);
      setSpinning(false);
      if (isAuthError(err)) {
        setShowLoginModal(true);
      } else {
        /*
         * 🛑 Show the SERVER'S reason, not one sentence for all of them.
         *
         * Both lines below used to be `l.errorFallback` — "Spin failed. Please
         * try again." — so a closed window, an exhausted per-user cap, a
         * misconfigured wheel and a genuine fault were indistinguishable, and
         * the retry that sentence invites could never succeed for most of them.
         *
         * `t` is the ROOT, unnamespaced translator: `toUserMessage` resolves
         * absolute `errors.codes.*` keys, which a namespaced translator cannot
         * reach. Omitting it (as this did) makes `toUserMessage` return the
         * fallback unconditionally — so the per-reason copy existed in
         * `messages/en.json` and was unreachable. Same reasoning as
         * `PlaceBidFormClient`.
         *
         * This only resolves because `onSpin` now throws an `ApiError` carrying
         * the response's `code` and `status`; while it threw a native `Error`,
         * `normalizeError` produced no code and `isAuthError` saw no status, so
         * a 401 never opened the login modal either.
         */
        const message = toUserMessage(e.code, t, { fallback: l.errorFallback });
        setError(message);
        showToast(message, "error");
      }
    }
  }, [disabled, eventId, l.errorFallback, onSpin, showToast, t]);

  /*
   * Looked up in the FULL prize list, not `activePrizes`. A prize deactivated
   * after somebody won it would otherwise render neither the prize box nor an
   * error — the win simply vanished from the page.
   */
  const wonPrize = resultPrizeId
    ? prizes.find((p) => p.id === resultPrizeId)
    : undefined;

  /*
   * Which SEGMENT to land on — an index into `activePrizes`, because that is
   * what the wheel draws.
   *
   * 🛑 `wonPrize` is looked up in the FULL list (a prize deactivated after
   * somebody won it must still render), but the INDEX must come from the
   * drawn list or the wheel would stop on the wrong wedge. `-1` means the
   * won prize is no longer on the wheel, which is a real state: the result
   * card still shows, the wheel simply does not animate to a segment that
   * is not there.
   */
  const winningIndex = useMemo(() => {
    if (!resultPrizeId) return null;
    const i = activePrizes.findIndex((p) => p.id === resultPrizeId);
    return i >= 0 ? i : null;
  }, [resultPrizeId, activePrizes]);

  return (
    <Stack gap="md">
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to spin the wheel. Please log in or create an account to continue."
      />
      <Heading
        level={2} size="xl" weight="semibold" color="primary">
        🎡 {l.heading}
      </Heading>

      <SpinWheel
        segments={activePrizes.map((p) => ({ id: p.id, label: p.label }))}
        winningIndex={winningIndex}
        spinning={spinning}
        onSettled={() => setSpinning(false)}
      />

      {/*
        * 🛑 THE PRIZE LIST, VISIBLE BEFORE SPINNING.
        *
        * `activePrizes` was computed and used ONLY to decide whether to
        * disable the button — so a visitor could not see what was on the
        * wheel at all. Showing it is also what makes the equal segments
        * honest: it says "these are the prizes", which is exactly what the
        * wheel can truthfully claim without publishing the odds.
        */}
      {!wonPrize && activePrizes.length > 0 && (
        <Row wrap gap="xs" justify="center" className="mt-3">
          {activePrizes.map((prize) => (
            <Span
              key={prize.id}
              layout="inline-flex"
              padding="pill-sm"
              rounded="full"
              size="xs"
              surface="muted"
            >
              {prize.label}
            </Span>
          ))}
        </Row>
      )}

      {wonPrize ? (
        <Div className={CLS_PRIZE_BOX}>
          <Text className="tracking-wide text-success" size="sm" transform="uppercase">
            {l.wonHeadline}
          </Text>
          <Text className={CLS_PRIZE_TITLE}>
            {wonPrize.label}
          </Text>
          {resultCoupon ? (
            <>
              <Text className={CLS_PRIZE_BODY}>
                {l.couponHint}{" "}
                <Span weight="semibold" className="font-mono">{resultCoupon}</Span>
              </Text>
              {/* Plan §10 — surfacing the won coupon as a usable CTA: copies
                  the code to the clipboard and deep-links to /checkout?coupon=…
                  so the prize is actually redeemable instead of just being
                  rendered as a string the user has to remember. */}
              <Row className="mt-3" justify="center">
                <ClaimCouponButton couponCode={resultCoupon} size="sm" source="spin" />
              </Row>
            </>
          ) : null}
        </Div>
      ) : null}

      {error ? (
        <Text className={CLS_ERROR_TEXT}>
          {error}
        </Text>
      ) : null}

      <Row justify="center">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSpin}
          disabled={disabled}
        >
          {spinning ? l.spinningButton : l.spinButton}
        </Button>
      </Row>

      {alreadyUsed ? (
        // audit-content-alignment-ok: self-contained circular spin-wheel game widget, status text centered under the wheel by design
        <Text size="sm" align="center" color="muted">
          {l.alreadySpun}
        </Text>
      ) : !inWindow ? (
        // audit-content-alignment-ok: self-contained circular spin-wheel game widget, status text centered under the wheel by design
        <Text size="sm" align="center" color="muted">
          {l.outsideWindow}
        </Text>
      ) : null}
    </Stack>
  );
}
