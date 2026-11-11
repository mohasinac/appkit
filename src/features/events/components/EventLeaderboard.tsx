import React from "react";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Span, Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import type { LeaderboardEntry, PollResultEntry } from "../types";

export interface EventLeaderboardProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  /** Render the full ranked list — caller provides entries via hook */
  renderList?: () => React.ReactNode;
  /** Render a single row; used when caller wants item-level control */
  renderEntry?: (entry: LeaderboardEntry, index: number) => React.ReactNode;
  /** Entries — used only when renderEntry is provided */
  entries?: LeaderboardEntry[];
  /**
   * Absolute-or-resolved href for one entry's detail page.
   *
   * 🛑 A STRING PREFIX, not a function. A function prop crossing a server →
   * client boundary is React #441 — it cannot be serialised, React writes an
   * error row at that prop position, the server still returns a complete 200
   * and the BROWSER dies at hydration. That defect took both content hosts
   * down for a week; `buildHref` was removed from the appkit views for exactly
   * this reason. The caller resolves the prefix through `resolveSectionHref`
   * and passes the result.
   *
   * Omitted → rows render unlinked, which is the correct degradation for a
   * host that does not serve entry detail pages.
   */
  entryHrefPrefix?: string;
  /**
   * When provided, renders a per-option vote-tally view instead of the
   * ranked voter list — use for event.type === "poll", where a
   * voter-by-points ranking is meaningless. Takes priority over
   * `renderList`/`entries` when set.
   */
  pollResults?: PollResultEntry[];
  /** Render a single poll-result row; used when caller wants item-level control */
  renderPollResult?: (result: PollResultEntry, index: number) => React.ReactNode;
  /** Empty state node */
  renderEmpty?: () => React.ReactNode;
  /** Loading spinner / skeleton */
  renderSkeleton?: () => React.ReactNode;
  labels?: {
    title?: string;
    noEntries?: string;
    points?: string;
    votes?: string;
  };
  className?: string;
}

export function EventLeaderboard({
  isLoading = false,
  isEmpty = false,
  renderList,
  renderEntry,
  entries = [],
  entryHrefPrefix,
  pollResults,
  renderPollResult,
  renderEmpty,
  renderSkeleton,
  labels = {},
  className = "",
}: EventLeaderboardProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return <Row justify="center" padding="y-xl">Loading…</Row>;
  }

  if (isEmpty) {
    if (renderEmpty) return <>{renderEmpty()}</>;
    return (
      <Text paddingY="md" variant="secondary" size="sm" align="start">
        {labels.noEntries ?? "No entries yet."}
      </Text>
    );
  }

  if (pollResults) {
    return (
      <Stack className={className} gap="sm">
        {pollResults.map((result, i) =>
          renderPollResult ? (
            <React.Fragment key={result.optionId}>
              {renderPollResult(result, i)}
            </React.Fragment>
          ) : (
            <Div
              key={result.optionId}
              layout="flex"
              align="center"
              justify="between"
              rounded="xl"
              padding="sm"
              className="border"
             data-section="eventleaderboard-pollresult-div">
              <Span weight="medium">{result.label}</Span>
              <Span size="sm" color="muted">
                {result.count} {labels.votes ?? "votes"} ({result.percent}%)
              </Span>
            </Div>
          ),
        )}
      </Stack>
    );
  }

  if (renderList) return <Div className={className}>{renderList()}</Div>;

  return (
    <Stack className={`${className}`} gap="sm">
      {entries.map((entry, i) =>
        renderEntry ? (
          <React.Fragment key={entry.userId}>
            {renderEntry(entry, i)}
          </React.Fragment>
        ) : (
          /*
           * 🛑 Keyed by `entryId` when present, not `userId`. The rows are PER
           * ENTRY now, so one entrant with two approved entries produced two
           * rows with the SAME React key — the duplicate-key bug that makes a
           * list reorder wrongly on re-render.
           */
          <Div
            key={entry.entryId ?? entry.userId}
            layout="flex"
            align="center"
            justify="between"
            rounded="xl"
            padding="sm"
            className="border"
           data-section="eventleaderboard-div-282">
            {/*
              The row LINKS to the entry being ranked. Owner, 2026-11-11: *"the
              leaderboard should clearly show the like count as well as the
              link to the entry details page"*. Unlinked when no prefix is
              given — a host that does not serve entry pages should not render
              a dead link.
            */}
            {/*
              🛑 `TextLink`, never a bare `<Link className="font-medium">`.
              A raw className carries no colour token, so the row inherits
              something invisible on a dark surface — that shipped once and the
              owner screenshotted an unreadable leaderboard.
            */}
            {entry.entryId && entryHrefPrefix ? (
              <TextLink
                href={`${entryHrefPrefix.replace(/\/+$/, "")}/${encodeURIComponent(entry.entryId)}`}
                variant="default"
                weight="medium"
              >
                #{entry.rank} {entry.userDisplayName}
              </TextLink>
            ) : (
              <Span weight="medium">
                #{entry.rank} {entry.userDisplayName}
              </Span>
            )}
            {/*
              🛑 The VOTE COUNT, not `totalPoints`.
              `points` is admin-typed and nothing in the contest path sets it,
              so every row read "0 pts" on a contest with real likes on it.
              `likeCount` is what the ranking rule actually ordered by, so the
              number shown and the order shown now come from one source.

              `totalPoints` is still rendered when an event has no votes but
              does carry a score — admin-judged events are a real mechanic.
            */}
            <Span>
              {typeof entry.likeCount === "number"
                ? `${entry.likeCount} ${labels.votes ?? "likes"}`
                : `${entry.totalPoints} ${labels.points ?? "pts"}`}
            </Span>
          </Div>
        ),
      )}
    </Stack>
  );
}
