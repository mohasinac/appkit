"use client";

/**
 * OfferPhaseTimeline — the offer-shaped wrapper around `<StatusTimeline>`.
 *
 * An offer is an order with more phases in front of it, so it shares the rail
 * and supplies only its own vocabulary:
 *
 *   made → countered → accepted → paid
 *   with declined / withdrawn / expired as the terminal-negative branch
 *
 * ## `superseded` is a RENDER KEY, never an OfferStatus
 *
 * A document that is `withdrawn` **and** carries `supersededByOfferId` is not
 * a walk-away — the buyer countered, and the negotiation continued into the
 * next round. It renders neutral ("Superseded"), not negative ("Withdrawn").
 *
 * Deliberately NOT an eighth `OfferStatus` value: `ADMIN_OFFER_STATUS_TABS`
 * would then gain a chip that matches zero stored rows, which is exactly the
 * defect `audit-filter-tab-enums` exists to catch.
 *
 * ## Back-compat
 *
 * Offers written before `statusHistory` existed have none. Branch B derives
 * what it can from the scalars — and `expired` gets **no date at all**,
 * because `expireMany` never wrote one. `updatedAt` is "last write of any
 * kind" and `expiresAt` is a deadline, not an event; using either would be a
 * fabricated timestamp.
 */

import {
  StatusTimeline,
  stepsFromEntries,
  type TimelineEntry,
  type TimelineStep,
} from "../../status-history/components/StatusTimeline";

const PHASE_LABELS: Record<string, string> = {
  pending: "Offer made",
  countered: "Countered",
  accepted: "Accepted",
  paid: "Paid",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  superseded: "Superseded",
};

const NEGATIVE = new Set(["declined", "withdrawn", "expired"]);

const labelFor = (status: string) => PHASE_LABELS[status] ?? status;
const isNegative = (status: string) => NEGATIVE.has(status);

/** One round of a negotiation, as returned by the API. */
export interface OfferChainRound {
  id: string;
  counterRound: number;
  status: string;
  offerAmount: number;
  counterAmount?: number;
  superseded: boolean;
  createdAt: string;
  respondedAt?: string;
  sellerNote?: string;
  buyerNote?: string;
}

/** Branch B — scalars only, for offers with no recorded history. */
function buildLegacySteps(o: {
  status: string;
  createdAt?: string;
  respondedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  superseded?: boolean;
}): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: "pending", label: PHASE_LABELS.pending, date: o.createdAt },
  ];
  const s = (o.status ?? "").toLowerCase();

  if (s === "countered") {
    steps.push({ key: "countered", label: PHASE_LABELS.countered, date: o.respondedAt });
  }
  if (s === "accepted" || s === "paid") {
    steps.push({
      key: "accepted",
      label: PHASE_LABELS.accepted,
      date: o.acceptedAt ?? o.respondedAt,
    });
  }
  if (s === "paid") {
    steps.push({ key: "paid", label: PHASE_LABELS.paid, date: o.paidAt });
  }
  if (s === "declined") {
    steps.push({ key: "declined", label: PHASE_LABELS.declined, date: o.respondedAt, negative: true });
  }
  if (s === "withdrawn") {
    steps.push(
      o.superseded
        ? { key: "superseded", label: PHASE_LABELS.superseded, date: o.respondedAt, muted: true }
        : { key: "withdrawn", label: PHASE_LABELS.withdrawn, date: o.respondedAt, negative: true },
    );
  }
  if (s === "expired") {
    // No date, on purpose. `expireMany` never wrote one before W2.
    steps.push({ key: "expired", label: PHASE_LABELS.expired, negative: true });
  }
  return steps;
}

/** Re-key a withdrawn+superseded step so it reads neutral, not negative. */
function applySupersede(steps: TimelineStep[], superseded: boolean): TimelineStep[] {
  if (!superseded) return steps;
  return steps.map((s) =>
    s.key === "withdrawn"
      ? { ...s, key: "superseded", label: PHASE_LABELS.superseded, negative: false, muted: true }
      : s,
  );
}

export interface OfferPhaseTimelineProps {
  status: string;
  timeline?: TimelineEntry[];
  timelineTruncated?: number;
  superseded?: boolean;
  createdAt?: string;
  respondedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  /**
   * Earlier rounds, oldest first. Concatenated ahead of this offer's own
   * steps into ONE rail, each introduced by a "Round N" divider — a
   * negotiation reads as one story, not N disconnected cards.
   */
  chain?: OfferChainRound[];
  className?: string;
}

export function OfferPhaseTimeline({
  status,
  timeline,
  timelineTruncated,
  superseded = false,
  createdAt,
  respondedAt,
  acceptedAt,
  paidAt,
  chain,
  className = "",
}: OfferPhaseTimelineProps) {
  const own = applySupersede(
    stepsFromEntries(timeline, labelFor, isNegative).length
      ? stepsFromEntries(timeline, labelFor, isNegative)
      : buildLegacySteps({ status, createdAt, respondedAt, acceptedAt, paidAt, superseded }),
    superseded,
  );

  const priorRounds = (chain ?? []).filter((r) => r.id !== undefined);
  const hasChain = priorRounds.length > 1;

  const steps: TimelineStep[] = hasChain
    ? priorRounds.flatMap((round, idx) => {
        const roundSteps = applySupersede(
          buildLegacySteps({
            status: round.status,
            createdAt: round.createdAt,
            respondedAt: round.respondedAt,
            superseded: round.superseded,
          }),
          round.superseded,
        );
        return roundSteps.map((s, i) => ({
          ...s,
          roundLabel: i === 0 ? `Round ${round.counterRound || idx + 1}` : undefined,
          note: i === roundSteps.length - 1 ? (round.sellerNote ?? round.buyerNote) : undefined,
        }));
      })
    : own;

  return (
    <StatusTimeline
      title={hasChain ? "Negotiation" : "Offer history"}
      steps={steps}
      truncatedCount={timelineTruncated}
      emptyLabel="No offer history yet"
      className={className}
    />
  );
}
