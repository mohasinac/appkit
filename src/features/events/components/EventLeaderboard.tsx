import React from "react";
import { Div, Row, Span, Stack, Text } from "../../../ui";
import type { LeaderboardEntry } from "../types";

export interface EventLeaderboardProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  /** Render the full ranked list — caller provides entries via hook */
  renderList?: () => React.ReactNode;
  /** Render a single row; used when caller wants item-level control */
  renderEntry?: (entry: LeaderboardEntry, index: number) => React.ReactNode;
  /** Entries — used only when renderEntry is provided */
  entries?: LeaderboardEntry[];
  /** Empty state node */
  renderEmpty?: () => React.ReactNode;
  /** Loading spinner / skeleton */
  renderSkeleton?: () => React.ReactNode;
  labels?: {
    title?: string;
    noEntries?: string;
    points?: string;
  };
  className?: string;
}

export function EventLeaderboard({
  isLoading = false,
  isEmpty = false,
  renderList,
  renderEntry,
  entries = [],
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
      <Text variant="secondary" size="sm" className="py-4" align="center">
        {labels.noEntries ?? "No entries yet."}
      </Text>
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
          <div
            key={entry.userId}
            className="flex items-center justify-between p-3 rounded-xl border"
           data-section="eventleaderboard-div-282">
            <Span weight="medium">
              #{entry.rank} {entry.userDisplayName}
            </Span>
            <Span>
              {entry.totalPoints} {labels.points ?? "pts"}
            </Span>
          </div>
        ),
      )}
    </Stack>
  );
}
