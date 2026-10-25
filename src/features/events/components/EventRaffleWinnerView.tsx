import { Article } from "../../../ui/components/Semantic";
import { ClaimCouponButton } from "../../../ui/components/ClaimCouponButton";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { TextLink } from "../../../ui/components/TextLink";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

export interface RaffleWinnerEvent {
  rafflePrize?: string;
  raffleWinnerUserId?: string;
  raffleWinnerDisplayName?: string;
  raffleEntryCount?: number;
  raffleTriggeredAt?: string | Date;
  raffleGithubFunctionUrl?: string;
  /**
   * Plan §10 — when the prize is a coupon, the issuing code so the winner
   * can claim it directly via the ClaimCouponButton. Pair with
   * `currentUserIsWinner` so the CTA only renders for the actual winner.
   */
  rafflePrizeCouponCode?: string;
  /**
   * Every prize coupon's code, for a raffle awarding more than one. Supersedes
   * the singular field above, which stays declared because raffles drawn
   * before this existed recorded only that.
   */
  rafflePrizeCouponCodes?: string[];
}

export interface EventRaffleWinnerViewProps {
  event: RaffleWinnerEvent;
  /** When true (= page resolver matched the viewer to raffleWinnerUserId), show the Claim CTA. */
  currentUserIsWinner?: boolean;
  labels?: {
    heading?: string;
    winnerLabel?: string;
    prizeLabel?: string;
    poolLabel?: string;
    fairnessLabel?: string;
    notDrawnYet?: string;
    anonymous?: string;
  };
}

const CLS_PANEL = "rounded-2xl border border-warning bg-warning-surface/60 dark:border-warning dark:bg-warning-surface p-[var(--appkit-space-6)] space-y-3";
const CLS_LABEL = "text-[length:var(--appkit-text-xs)] uppercase tracking-wide text-warning dark:text-warning";
const CLS_WINNER_NAME = "mt-1 text-[length:var(--appkit-text-2xl)] font-bold text-warning dark:text-warning";

const DEFAULT_LABELS: Required<NonNullable<EventRaffleWinnerViewProps["labels"]>> = {
  heading: "Raffle Winner",
  winnerLabel: "Winner",
  prizeLabel: "Prize",
  poolLabel: "Entries in pool",
  fairnessLabel: "Verifiable randomness",
  notDrawnYet: "The raffle has not been drawn yet.",
  anonymous: "Anonymous participant",
};

export function EventRaffleWinnerView({ event, currentUserIsWinner, labels }: EventRaffleWinnerViewProps) {
  const l = { ...DEFAULT_LABELS, ...(labels ?? {}) };

  /*
   * Array first, singular as the fallback — and deduped, because the page
   * feeds `rafflePrizeCouponCode` from the first entry of the same list, so a
   * naive concat would render the first prize twice.
   */
  const winnerCouponCodes = Array.from(
    new Set(
      event.rafflePrizeCouponCodes?.length
        ? event.rafflePrizeCouponCodes
        : event.rafflePrizeCouponCode
          ? [event.rafflePrizeCouponCode]
          : [],
    ),
  );

  if (!event.raffleWinnerUserId) {
    return (
      <Div className="border-dashed text-left" border="strong" paddingY="y-2xl" paddingX="x-lg" rounded="xl">
        <Text color="muted">{l.notDrawnYet}</Text>
      </Div>
    );
  }

  return (
    <Article>
      <Stack gap="lg">
      <Heading
        level={2} size="xl" weight="semibold" color="primary">
        🎟️ {l.heading}
      </Heading>

      <Div className={CLS_PANEL}>
        <Div>
          <Text className={CLS_LABEL}>
            {l.winnerLabel}
          </Text>
          <Text className={CLS_WINNER_NAME}>
            {event.raffleWinnerDisplayName?.trim() || l.anonymous}
          </Text>
        </Div>

        {event.rafflePrize ? (
          <Div>
            <Text className={CLS_LABEL}>
              {l.prizeLabel}
            </Text>
            <Text className="mt-1" color="primary" size="base">
              {event.rafflePrize}
            </Text>
          </Div>
        ) : null}

        {/* Plan §10 — when the prize is a coupon code AND the viewer is the
            winner, surface a one-click Claim button that auto-claims into the
            wallet + deep-links to the cart. */}
        {/*
          🛑 One Claim button PER CODE. A raffle may award several coupons, and
          `ClaimCouponButton` claims exactly one — so rendering only the first
          would show the winner a complete-looking prize while silently
          stranding the rest, with no surface anywhere that lists them.

          Falls back to the singular `rafflePrizeCouponCode` when the array is
          absent: every raffle drawn before this change recorded only the
          scalar, and those winners must keep their button.
        */}
        {currentUserIsWinner && winnerCouponCodes.length > 0 ? (
          <Div padding="t-xs">
            <Row wrap className="gap-x-3 gap-y-2">
              {winnerCouponCodes.map((code) => (
                <ClaimCouponButton
                  key={code}
                  couponCode={code}
                  source="raffle"
                  size="sm"
                />
              ))}
            </Row>
          </Div>
        ) : null}

        <Row wrap textSize="sm" className="gap-x-6 gap-y-2" color="muted" padding="t-xs">
          {typeof event.raffleEntryCount === "number" ? (
            <Span>
              {l.poolLabel}:{" "}
              <Span weight="medium" color="primary">
                {event.raffleEntryCount}
              </Span>
            </Span>
          ) : null}
          {event.raffleTriggeredAt ? (
            <Span>
              {new Date(event.raffleTriggeredAt).toLocaleString()}
            </Span>
          ) : null}
        </Row>
      </Div>

      {event.raffleGithubFunctionUrl ? (
        <Div textSize="sm" className={`${__P.p4}`} rounded="lg" border="default">
          <Text weight="medium" color="primary">
            {l.fairnessLabel}
          </Text>
          <TextLink
            href={event.raffleGithubFunctionUrl}
            className="mt-1 block break-all text-primary-600 dark:text-primary-400 hover:underline"
          >
            {event.raffleGithubFunctionUrl}
          </TextLink>
        </Div>
      ) : null}
      </Stack>
    </Article>
  );
}
