"use client";

/**
 * PrizeRevealModal (SB4-I, redesigned for fully-automatic reveal)
 *
 * Displays a prize-draw order's reveal state. Reveal is no longer a buyer
 * action — the winner is assigned automatically by assignPrizeDrawWinner(),
 * either the moment payment is confirmed ("instant" mode) or by a scheduled
 * Firebase Function at draw expiry/sellout ("scheduled" mode). This modal is
 * a pure display: "pending" (no result yet) or "won" (order.prizeWon is set).
 */

import { Anchor, Div, Heading, Modal, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { PrizeDrawCollage } from "./PrizeDrawCollage";
import type { PrizeDrawItem } from "../schemas/firestore";

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

  return (
    <Modal isOpen={open} onClose={onClose} title="Prize Reveal" size="lg">
      <Stack gap="md">
        <PrizeDrawCollage items={items} hideWonState />

        {!winner ? (
          // audit-content-alignment-ok: informational reveal-status panel, not marketing content
          <Div className={`bg-[var(--appkit-color-surface-muted)] ${__P.p4} text-center`} rounded="default">
            <Text size="lg" weight="semibold">Reveal pending</Text>
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
              {PENDING_COPY[revealMode]}
            </Text>
          </Div>
        ) : (
          // audit-content-alignment-ok: theatrical reveal-modal centerpiece, not marketing content
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
              <Text className="mt-2 text-[var(--appkit-color-text-muted)]" size="sm">
                Estimated value: ₹
                {winner.estimatedValue.toLocaleString("en-IN")}
              </Text>
            ) : null}
          </Div>
        )}

        {/* Always-visible fairness disclaimer. */}
        <Div textSize="xs" className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-muted)] text-[var(--appkit-color-text-muted)]" padding="inlineSm" rounded="default">
          <Span weight="bold">
            Fairness guarantee:
          </Span>{" "}
          Winners are picked by <code>crypto.randomInt</code> running on
          LetItRip's server the moment your prize is assigned. Neither the
          store nor LetItRip staff can influence the outcome.{" "}
          {rngSourceUrl ? (
            <Anchor href={rngSourceUrl} tone="none" underline="always">
              View RNG source code →
            </Anchor>
          ) : null}
        </Div>
      </Stack>
    </Modal>
  );
}

export default PrizeRevealModal;
