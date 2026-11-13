import React from "react";
import { Badge } from "../../../ui/components/Badge";

/**
 * ── THE PUBLIC SHAPE OF A PRIZE TAG ───────────────────────────────────────────
 *
 * 🛑 `winnerUserIds` IS DELIBERATELY ABSENT, AND ITS ABSENCE IS THE CONTROL.
 *
 * `ProductEventPrize` (the stored shape) carries `winnerUserIds` — the uids
 * entitled to CLAIM the prize. Nothing on a promotional surface may publish
 * them, so the promotions surfaces do not merely avoid rendering the field:
 * they are typed against a shape that does not have it. A component cannot
 * leak a property its prop type never declared, which makes the omission a
 * compile error rather than a code-review habit.
 *
 * ⚠ This is not the same as hiding the prize. Visibility and entitlement are
 * separate by design (see `ProductEventPrize.winnerUserIds`): everyone may SEE
 * a prize — it is advertising — and only the winners may take it. So the public
 * tag carries the event reference and the billing, and nothing about who won.
 */
export interface PublicEventPrizeTag {
  /**
   * The event this listing is a prize for, owned by the events subdomain.
   *
   * ⚠ Optional here while required on the stored block, because this type
   * describes what a PUBLIC surface receives after projection — a row whose
   * event reference was dropped still renders its label rather than vanishing.
   */
  eventId?: string;
  /** This listing's standing in that event — "Grand Prize", "Runner-up". */
  label?: string;
  /** Whether the prize is announced. Re-checked here; see `EventPrizeLabel`. */
  showInPromotions?: boolean;
}

/**
 * What a prize with no billing is called.
 *
 * One definition, because the fallback is rendered from two places (the badge
 * on a listing surface and the chip on the promotions group) and a second
 * spelling of it is a string that drifts.
 */
export const EVENT_PRIZE_FALLBACK_LABEL = "Prize";

/**
 * ⚠ DEGRADES, never disappears. A prize whose `label` is missing or blank is
 * still a prize, so it renders the fallback — the alternative is a prize group
 * containing an unlabelled card, which reads as a rendering bug.
 *
 * `.trim()` before the `||` so a whitespace-only label (an admin who typed a
 * space into the field and saved) takes the fallback rather than rendering an
 * empty chip with padding and no text.
 */
export function resolveEventPrizeLabel(
  prize: PublicEventPrizeTag | null | undefined,
): string {
  return prize?.label?.trim() || EVENT_PRIZE_FALLBACK_LABEL;
}

export interface EventPrizeLabelProps {
  prize?: PublicEventPrizeTag | null;
  className?: string;
}

/**
 * The prize chip for a promotions-surface card.
 *
 * 🛑 GATED ON `showInPromotions`, NOT on the presence of `eventId` — the same
 * rule the detail-page badge follows. A prize can be RECORDED against an event
 * before it is ANNOUNCED, and linking the two must not publish it, so the
 * announce flag is the only thing that may decide a render.
 *
 * ⚠ Re-checked here even though every caller filters server-side. It is one
 * `if` and it fails CLOSED: a future caller that forgets the filter renders
 * nothing rather than announcing an unannounced prize. The server filter is
 * the control; this is the backstop.
 */
export function EventPrizeLabel({ prize, className = "" }: EventPrizeLabelProps) {
  if (!prize?.showInPromotions) return null;
  return (
    <Badge variant="success" size="xs" className={className}>
      🏆 {resolveEventPrizeLabel(prize)}
    </Badge>
  );
}
