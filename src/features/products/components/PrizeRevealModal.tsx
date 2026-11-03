"use client";

/**
 * PrizeRevealModal (SB4-I, redesigned for fully-automatic reveal)
 *
 * Displays a prize-draw order's reveal state. Reveal is no longer a buyer
 * action — the winner is assigned automatically by assignRandomLotsWinner(),
 * either the moment payment is confirmed ("instant" mode) or by a scheduled
 * Firebase Function at draw expiry/sellout ("scheduled" mode). This modal is
 * a pure display: "pending" (no result yet) or "won" (order.prizeWon is set).
 */

import { useEffect, useState } from "react";
import { Anchor } from "../../../ui/components/Anchor";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Modal } from "../../../ui/components/Modal";
import { PricesOnly } from "../../../ui/components/GatedPrice";
import { Stack } from "../../../ui/components/Layout";
import { MediaImage } from "../../../ui/components/MediaImage";
import { AnimatePresence, ScaleIn, FadeIn } from "../../../ui/components/Motion";
import { Disclaimer } from "../../../ui/components/Disclaimer";
import { RandomLotsCollage } from "./RandomLotsCollage";
import type { PrizeDrawItem } from "../schemas/firestore";
import { getBrandName } from "../../../core/brand-resolver";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

export interface PrizeRevealResult {
  itemNumber: number;
  title: string;
  images: string[];
  estimatedValue?: number;
}

export interface PrizeRevealModalProps {
  open: boolean;
  onClose: () => void;
  /** Items to render in the collage (won state hidden — buyers don't see prior wins). */
  items: PrizeDrawItem[];
  /** Already-assigned prize, from `order.prizeWon`. Undefined while still pending. */
  initialPrizeWon?: PrizeRevealResult;
  /** Drives the pending-state copy — "instant" vs "scheduled" draws explain differently. */
  revealMode?: "instant" | "scheduled";
  /** Public proof-of-fairness URL — shown in the disclaimer. */
  rngSourceUrl?: string;
}

const PENDING_COPY: Record<"instant" | "scheduled", string> = {
  instant: "Your prize is being assigned now that payment is confirmed — refresh in a moment.",
  scheduled: "This draw reveals automatically once it closes (at its expiry date) or sells out — check back here after.",
};

/** How long the "revealing" build-up plays before the winner pops in. */
const REVEAL_BUILDUP_MS = 1400;

export function PrizeRevealModal({
  open,
  onClose,
  items,
  initialPrizeWon,
  revealMode = "scheduled",
  rngSourceUrl,
}: PrizeRevealModalProps) {
  const winner = initialPrizeWon;
  const winnerImg = winner?.images?.[0];

  /*
   * Phase 5A (overhaul brief) — "a proper animated opening experience", not
   * the abrupt conditional swap this modal shipped with. `revealed` starts
   * false every time the modal opens WITH a winner already known (a buyer
   * returning to an already-revealed order should still get the payoff, not
   * just a static card) and flips true after one short build-up beat.
   * Deliberately NOT a slot-machine/spin simulation — that would imply the
   * outcome is still being decided, when `assignRandomLotsWinner()` already
   * decided it server-side; this is a reveal of a fact, not a randomizer.
   */
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!open || !winner) {
      setRevealed(false);
      return;
    }
    const id = window.setTimeout(() => setRevealed(true), REVEAL_BUILDUP_MS);
    return () => window.clearTimeout(id);
    // Re-run per `open` cycle, not per winner identity — the point is to
    // replay the beat each time this modal is opened with a known winner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, !!winner]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Prize Reveal" size="lg">
      <Stack gap="md">
        <RandomLotsCollage items={items} hideWonState />

        <AnimatePresence mode="wait">
          {!winner ? (
            <FadeIn key="pending">
              {/* audit-content-alignment-ok: informational reveal-status panel, not marketing content */}
              <Div className={`bg-[var(--appkit-color-bg)] ${__P.p4} text-center`} rounded="default">
                <Text size="lg" weight="semibold">Reveal pending</Text>
                <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                  {PENDING_COPY[revealMode]}
                </Text>
              </Div>
            </FadeIn>
          ) : !revealed ? (
            <FadeIn key="building">
              {/* audit-content-alignment-ok: the build-up beat before the win card appears */}
              <Div className={`border-2 border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${__P.p4} text-center animate-pulse`} rounded="lg">
                <Text className="tracking-wider text-[var(--appkit-color-text-muted)]" size="xs" transform="uppercase">
                  Revealing your prize…
                </Text>
              </Div>
            </FadeIn>
          ) : (
            <ScaleIn key="revealed">
              {/* audit-content-alignment-ok: theatrical reveal-modal centerpiece, not marketing content */}
              <Div className={`border-2 border-[var(--appkit-color-primary)] bg-[var(--appkit-color-surface)] ${__P.p4} text-center`} rounded="lg">
                <Text className="tracking-wider text-[var(--appkit-color-text-muted)]" size="xs" transform="uppercase">
                  You won
                </Text>
                <Heading level={2} className="my-2">
                  #{winner.itemNumber} — {winner.title}
                </Heading>
                {winnerImg ? (
                  <Div className="relative mx-auto h-64 w-64 max-w-full" rounded="md" overflow="hidden">
                    <MediaImage src={winnerImg} alt={winner.title} size="hero" objectFit="contain" />
                  </Div>
                ) : null}
                {winner.estimatedValue != null ? (
                  <PricesOnly>
                    <Text className="mt-2 text-[var(--appkit-color-text-muted)]" size="sm">
                      Estimated value: ₹
                      {winner.estimatedValue.toLocaleString("en-IN")}
                    </Text>
                  </PricesOnly>
                ) : null}
              </Div>
            </ScaleIn>
          )}
        </AnimatePresence>

        {/* Always-visible fairness disclaimer. */}
        <Div textSize="xs" className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-bg)] text-[var(--appkit-color-text-muted)]" padding="inlineSm" rounded="default">
          <Span weight="bold">
            Fairness guarantee:
          </Span>{" "}
          Winners are picked by <code>crypto.randomInt</code> running on
          {getBrandName()}'s server the moment your prize is assigned. Neither the
          store nor {getBrandName()} staff can influence the outcome.{" "}
          {rngSourceUrl ? (
            <Anchor href={rngSourceUrl} tone="none" underline="always">
              View RNG source code →
            </Anchor>
          ) : null}
        </Div>

        {/*
          Phase 5A (overhaul brief) — this surface was already named in the
          disclaimer registry's own `surfaces` list, but never actually
          rendered it. `inline`: the fairness box above already supplies the
          surrounding chrome.
        */}
        <Disclaimer id="random-lots" inline />
      </Stack>
    </Modal>
  );
}

export default PrizeRevealModal;
