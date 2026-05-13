import { Article, Div, Heading, Span, Text, TextLink } from "../../../ui";

export interface RaffleWinnerEvent {
  rafflePrize?: string;
  raffleWinnerUserId?: string;
  raffleWinnerDisplayName?: string;
  raffleEntryCount?: number;
  raffleTriggeredAt?: string | Date;
  raffleGithubFunctionUrl?: string;
}

export interface EventRaffleWinnerViewProps {
  event: RaffleWinnerEvent;
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

const DEFAULT_LABELS: Required<NonNullable<EventRaffleWinnerViewProps["labels"]>> = {
  heading: "Raffle Winner",
  winnerLabel: "Winner",
  prizeLabel: "Prize",
  poolLabel: "Entries in pool",
  fairnessLabel: "Verifiable randomness",
  notDrawnYet: "The raffle has not been drawn yet.",
  anonymous: "Anonymous participant",
};

export function EventRaffleWinnerView({ event, labels }: EventRaffleWinnerViewProps) {
  const l = { ...DEFAULT_LABELS, ...(labels ?? {}) };

  if (!event.raffleWinnerUserId) {
    return (
      <Div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-10 text-center">
        <Text className="text-zinc-500 dark:text-zinc-400">{l.notDrawnYet}</Text>
      </Div>
    );
  }

  return (
    <Article className="space-y-4">
      <Heading
        level={2}
        className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
      >
        🎟️ {l.heading}
      </Heading>

      <Div className="rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20 p-6 space-y-3">
        <Div>
          <Text className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {l.winnerLabel}
          </Text>
          <Text className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
            {event.raffleWinnerDisplayName?.trim() || l.anonymous}
          </Text>
        </Div>

        {event.rafflePrize ? (
          <Div>
            <Text className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {l.prizeLabel}
            </Text>
            <Text className="mt-1 text-base text-zinc-800 dark:text-zinc-100">
              {event.rafflePrize}
            </Text>
          </Div>
        ) : null}

        <Div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {typeof event.raffleEntryCount === "number" ? (
            <Span>
              {l.poolLabel}:{" "}
              <Span className="font-medium text-zinc-900 dark:text-zinc-100">
                {event.raffleEntryCount}
              </Span>
            </Span>
          ) : null}
          {event.raffleTriggeredAt ? (
            <Span>
              {new Date(event.raffleTriggeredAt).toLocaleString()}
            </Span>
          ) : null}
        </Div>
      </Div>

      {event.raffleGithubFunctionUrl ? (
        <Div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 text-sm">
          <Text className="font-medium text-zinc-700 dark:text-zinc-200">
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
    </Article>
  );
}
