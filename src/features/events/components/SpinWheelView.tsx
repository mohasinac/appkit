"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Div, Heading, LoginRequiredModal, Span, Text } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import type { SpinPrize } from "../types";

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
      setSpinning(false);
      if (isAuthError(err)) {
        setShowLoginModal(true);
      } else {
        setError(l.errorFallback);
      }
    }
  }, [disabled, eventId, l.errorFallback, onSpin]);

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
        level={2}
        className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
      >
        🎡 {l.heading}
      </Heading>

      <Div
        className="relative mx-auto aspect-square w-64 overflow-hidden rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-100 via-rose-100 to-violet-100 dark:from-amber-900/40 dark:via-rose-900/40 dark:to-violet-900/40"
        aria-label="Spin wheel"
      >
        <Div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            animation: spinning
              ? `lir-spin ${ANIMATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
              : undefined,
          }}
        >
          <Text className="text-4xl">🎁</Text>
        </Div>
        <style>{`
          @keyframes lir-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(2160deg); }
          }
        `}</style>
      </Div>

      {wonPrize ? (
        <Div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30 p-4 text-center">
          <Text className="text-sm uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {l.wonHeadline}
          </Text>
          <Text className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">
            {wonPrize.label}
          </Text>
          {resultCoupon ? (
            <Text className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
              {l.couponHint}{" "}
              <Span className="font-mono font-semibold">{resultCoupon}</Span>
            </Text>
          ) : null}
        </Div>
      ) : null}

      {error ? (
        <Text className="text-sm text-rose-600 dark:text-rose-400 text-center">
          {error}
        </Text>
      ) : null}

      <Div className="flex justify-center">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSpin}
          disabled={disabled}
        >
          {spinning ? l.spinningButton : l.spinButton}
        </Button>
      </Div>

      {alreadyUsed ? (
        <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {l.alreadySpun}
        </Text>
      ) : !inWindow ? (
        <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {l.outsideWindow}
        </Text>
      ) : null}
    </Div>
  );
}
