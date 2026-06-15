"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, ClaimCouponButton, Div, Heading, LoginRequiredModal, Row, Span, Text, useToast } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import type { SpinPrize } from "../types";

import { normalizeError } from "../../../errors/normalize";
const CLS_WHEEL = "relative mx-auto aspect-square w-64 overflow-hidden rounded-full border-4 border-warning bg-gradient-to-br from-warning via-rose-100 to-violet-100 dark:from-warning/40 dark:via-rose-900/40 dark:to-violet-900/40";
const CLS_PRIZE_BOX = "rounded-xl border border-success bg-success-surface dark:border-success p-4 text-center";
const CLS_PRIZE_TITLE = "mt-1 text-lg font-bold text-success dark:text-success";
const CLS_PRIZE_BODY = "mt-2 text-sm text-success dark:text-success";
const CLS_ERROR_TEXT = "text-sm text-error dark:text-error text-center";

export interface SpinWheelViewProps {
  eventId: string;
  prizes: SpinPrize[];
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

const ANIMATION_MS = 3200;

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
      const result = await onSpin(eventId);
      window.setTimeout(() => {
        setSpinning(false);
        if (result.spinPrizeId) {
          setResultPrizeId(result.spinPrizeId);
          setResultCoupon(result.spinPrizeCouponCode);
        } else {
          setError(l.errorFallback);
        }
      }, ANIMATION_MS);
    } catch (err) {
      void normalizeError(err);
      setSpinning(false);
      if (isAuthError(err)) {
        setShowLoginModal(true);
      } else {
        setError(l.errorFallback);
        showToast(err instanceof Error ? err.message : l.errorFallback, "error");
      }
    }
  }, [disabled, eventId, l.errorFallback, onSpin, showToast]);

  const wonPrize = resultPrizeId
    ? activePrizes.find((p) => p.id === resultPrizeId)
    : undefined;

  return (
    <Div className="space-y-4">
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to spin the wheel. Please log in or create an account to continue."
      />
      <Heading
        level={2} size="xl" weight="semibold" color="primary">
        🎡 {l.heading}
      </Heading>

      <Div
        className={CLS_WHEEL}
        aria-label="Spin wheel"
      >
        <Row
          className="absolute inset-0" align="center" justify="center"
          style={{
            animation: spinning
              ? `lir-spin ${ANIMATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
              : undefined,
          }}
        >
          <Text size="4xl">🎁</Text>
        </Row>
        <style>{`
          @keyframes lir-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(2160deg); }
          }
        `}</style>
      </Div>

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
        <Text size="sm" align="center" color="muted">
          {l.alreadySpun}
        </Text>
      ) : !inWindow ? (
        <Text size="sm" align="center" color="muted">
          {l.outsideWindow}
        </Text>
      ) : null}
    </Div>
  );
}
