"use client";

/**
 * PrizeRevealModal (SB4-I)
 *
 * Theatrical reveal UI for prize-draw orders. When the buyer clicks "Reveal
 * my prize" we call the reveal API (which has already picked the winner via
 * crypto.randomInt server-side) and then run a 3-second highlight-cycling
 * animation across the collage — fast at first, decelerating, finally
 * landing on the winning tile. This is pure showmanship: the winner was
 * locked in by the server before the first frame rendered.
 *
 * A permanent disclaimer below the collage explains exactly that — the RNG
 * is `crypto.randomInt`, the source code is on GitHub, and neither the store
 * nor LetItRip admins can influence the outcome.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Div, Heading, LoginRequiredModal, Modal, Stack, Text } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import { PrizeDrawCollage } from "./PrizeDrawCollage";
import type { PrizeDrawItem } from "../schemas/firestore";

export interface PrizeRevealResponse {
  prizeWon?: {
    itemNumber: number;
    title: string;
    images: string[];
    estimatedValue?: number;
  };
  alreadyRevealed?: boolean;
  rngSourceUrl?: string;
  refunded?: true;
  reason?: string;
}

export interface PrizeRevealModalProps {
  open: boolean;
  onClose: () => void;
  /** Items to render in the collage (won state hidden — buyers don't see prior wins). */
  items: PrizeDrawItem[];
  /** Order id used by the reveal endpoint. */
  orderId: string;
  /** Product id used in the reveal URL. */
  productId: string;
  /** Override the default `/api/prize-draws/[id]/reveal` POST call. */
  onReveal?: (args: { orderId: string; productId: string }) => Promise<PrizeRevealResponse>;
  /** Already-revealed prize, passed in if the order has `prizeWon` populated. */
  initialPrizeWon?: PrizeRevealResponse["prizeWon"];
  /** Public proof-of-fairness URL — shown in the disclaimer. */
  rngSourceUrl?: string;
}

const REVEAL_DURATION_MS = 3200; // total animation length
const CYCLE_INTERVAL_FAST = 80;
const CYCLE_INTERVAL_SLOW = 360;

export function PrizeRevealModal({
  open,
  onClose,
  items,
  orderId,
  productId,
  onReveal,
  initialPrizeWon,
  rngSourceUrl,
}: PrizeRevealModalProps) {
  const [phase, setPhase] = useState<
    "idle" | "revealing" | "won" | "refunded" | "error"
  >(initialPrizeWon ? "won" : "idle");
  const [highlight, setHighlight] = useState<number | undefined>(undefined);
  const [winner, setWinner] = useState<PrizeRevealResponse["prizeWon"] | undefined>(
    initialPrizeWon,
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [effectiveRngUrl, setEffectiveRngUrl] = useState<string | undefined>(
    rngSourceUrl,
  );
  const [showLoginModal, setShowLoginModal] = useState(false);

  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on close/unmount so we don't leak between sessions.
  useEffect(() => {
    if (!open) {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      cycleTimerRef.current = null;
      endTimerRef.current = null;
    }
    return () => {
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    };
  }, [open]);

  const startAnimation = useCallback(
    (winningItemNumber: number) => {
      const startedAt = Date.now();
      const tile = (n: number) =>
        items[n % items.length]?.itemNumber ?? winningItemNumber;
      let step = 0;

      const tick = () => {
        const elapsed = Date.now() - startedAt;
        const remaining = REVEAL_DURATION_MS - elapsed;
        if (remaining <= 0) {
          setHighlight(winningItemNumber);
          return;
        }
        // Decelerate: as we approach the end, the interval stretches.
        const progress = elapsed / REVEAL_DURATION_MS;
        const interval =
          CYCLE_INTERVAL_FAST +
          (CYCLE_INTERVAL_SLOW - CYCLE_INTERVAL_FAST) * progress;
        step += 1;
        setHighlight(tile(step));
        cycleTimerRef.current = setTimeout(tick, interval);
      };
      tick();
    },
    [items],
  );

  const handleRevealClick = useCallback(async () => {
    if (phase !== "idle") return;
    setPhase("revealing");
    setErrorMessage("");

    let response: PrizeRevealResponse;
    try {
      if (onReveal) {
        response = await onReveal({ orderId, productId });
      } else {
        const res = await fetch(`/api/prize-draws/${productId}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const json = (await res.json()) as { data?: PrizeRevealResponse };
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setPhase("idle");
            setShowLoginModal(true);
            return;
          }
          throw new Error("Reveal request failed");
        }
        response = json.data ?? {};
      }
    } catch (err) {
      if (isAuthError(err)) {
        setPhase("idle");
        setShowLoginModal(true);
        return;
      }
      setPhase("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Reveal request failed",
      );
      return;
    }

    if (response.refunded) {
      setPhase("refunded");
      return;
    }
    if (!response.prizeWon) {
      setPhase("error");
      setErrorMessage("Unexpected reveal response");
      return;
    }
    if (response.rngSourceUrl) setEffectiveRngUrl(response.rngSourceUrl);
    setWinner(response.prizeWon);

    if (response.alreadyRevealed) {
      // No theatrics for re-opens — just show the prize.
      setHighlight(response.prizeWon.itemNumber);
      setPhase("won");
      return;
    }

    startAnimation(response.prizeWon.itemNumber);
    endTimerRef.current = setTimeout(() => {
      setPhase("won");
    }, REVEAL_DURATION_MS);
  }, [onReveal, orderId, phase, productId, startAnimation]);

  const winnerImg = winner?.images?.[0];

  return (
    <Modal isOpen={open} onClose={onClose} title="Prize Reveal" size="lg">
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to reveal your prize. Please log in or create an account to continue."
      />
      <Stack gap="md">
        {phase === "refunded" ? (
          <Div className="rounded border border-yellow-400/40 bg-yellow-50 px-4 py-3 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100">
            <Heading level={3} className="mb-1">
              Pool exhausted — you've been refunded
            </Heading>
            <Text className="text-sm">
              Every prize in this draw was already claimed by the time your
              entry rolled. Your order has been marked refunded automatically.
            </Text>
          </Div>
        ) : null}

        {phase === "error" ? (
          <Div className="rounded border border-red-400/40 bg-red-50 px-4 py-3 text-red-900 dark:bg-red-900/30 dark:text-red-100">
            <Text className="text-sm font-semibold">Something went wrong</Text>
            <Text className="text-sm">{errorMessage}</Text>
          </Div>
        ) : null}

        <PrizeDrawCollage
          items={items}
          hideWonState
          highlightItemNumber={highlight}
        />

        {phase === "idle" ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleRevealClick}
          >
            ✨ Reveal my prize
          </Button>
        ) : null}

        {phase === "revealing" ? (
          <Div className="rounded bg-[var(--appkit-color-surface-muted)] p-4 text-center">
            <Text className="text-lg font-semibold">Rolling…</Text>
            <Text className="text-sm text-[var(--appkit-color-text-muted)]">
              The winner was locked by the server before this animation started.
              Hang tight — we're just making it look pretty.
            </Text>
          </Div>
        ) : null}

        {phase === "won" && winner ? (
          <Div className="rounded-lg border-2 border-[var(--appkit-color-primary)] bg-[var(--appkit-color-surface)] p-4 text-center">
            <Text className="text-xs uppercase tracking-wider text-[var(--appkit-color-text-muted)]">
              You won
            </Text>
            <Heading level={2} className="my-2">
              #{winner.itemNumber} — {winner.title}
            </Heading>
            {winnerImg ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={winnerImg}
                alt={winner.title}
                className="mx-auto max-h-64 rounded"
              />
            ) : null}
            {winner.estimatedValue != null ? (
              <Text className="mt-2 text-sm text-[var(--appkit-color-text-muted)]">
                Estimated value: ₹
                {(winner.estimatedValue / 100).toLocaleString("en-IN")}
              </Text>
            ) : null}
          </Div>
        ) : null}

        {/* Always-visible fairness disclaimer. */}
        <Div className="rounded border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-muted)] px-3 py-2 text-xs text-[var(--appkit-color-text-muted)]">
          <strong className="text-[var(--appkit-color-text)]">
            Fairness guarantee:
          </strong>{" "}
          Winners are picked by <code>crypto.randomInt</code> running on
          LetItRip's server before the animation starts. The animation is
          theatrical — neither the store nor LetItRip staff can influence the
          outcome.{" "}
          {effectiveRngUrl ? (
            <a
              href={effectiveRngUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              View RNG source code →
            </a>
          ) : null}
        </Div>
      </Stack>
    </Modal>
  );
}

export default PrizeRevealModal;
