import React from "react";
import { Span, Text } from "@mohasinac/ui";
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
    return <div className="flex justify-center py-8">Loading…</div>;
  }

  if (isEmpty) {
    if (renderEmpty) return <>{renderEmpty()}</>;
    return (
      <Text variant="secondary" size="sm" className="text-center py-4">
        {labels.noEntries ?? "No entries yet."}
      </Text>
    );
  }

  if (renderList) return <div className={className}>{renderList()}</div>;

  return (
    <div className={`space-y-2 ${className}`}>
      {entries.map((entry, i) =>
        renderEntry ? (
          <React.Fragment key={entry.userId}>
            {renderEntry(entry, i)}
          </React.Fragment>
        ) : (
          <div
            key={entry.userId}
            className="flex items-center justify-between p-3 rounded-xl border"
          >
            <Span className="font-medium">
              #{entry.rank} {entry.userDisplayName}
            </Span>
            <Span>
              {entry.points} {labels.points ?? "pts"}
            </Span>
          </div>
        ),
      )}
    </div>
  );
}
