import React from "react";
import { Div, Row, Span, Stack, Text } from "../../../ui";
import type { BugHunterLeaderboardEntry } from "../schemas/firestore";

export interface BugHunterLeaderboardViewProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  /** Render the full ranked list — caller provides entries via hook */
  renderList?: () => React.ReactNode;
  /** Render a single row; used when caller wants item-level control */
  renderEntry?: (entry: BugHunterLeaderboardEntry, index: number) => React.ReactNode;
  /** Entries — used only when renderEntry is provided */
  entries?: BugHunterLeaderboardEntry[];
  /** Empty state node */
  renderEmpty?: () => React.ReactNode;
  /** Loading spinner / skeleton */
  renderSkeleton?: () => React.ReactNode;
  labels?: {
    title?: string;
    noEntries?: string;
    bugs?: string;
  };
  className?: string;
}

export function BugHunterLeaderboardView({
  isLoading = false,
  isEmpty = false,
  renderList,
  renderEntry,
  entries = [],
  renderEmpty,
  renderSkeleton,
  labels = {},
  className = "",
}: BugHunterLeaderboardViewProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return <Row justify="center" padding="y-xl">Loading…</Row>;
  }

  if (isEmpty) {
    if (renderEmpty) return <>{renderEmpty()}</>;
    return (
      <Text paddingY="md" variant="secondary" size="sm" align="start">
        {labels.noEntries ?? "No confirmed bugs yet."}
      </Text>
    );
  }

  if (renderList) return <Div className={className}>{renderList()}</Div>;

  return (
    <Stack className={`${className}`} gap="sm">
      {entries.map((entry, i) =>
        renderEntry ? (
          <React.Fragment key={entry.hunterId}>
            {renderEntry(entry, i)}
          </React.Fragment>
        ) : (
          <Div
            key={entry.hunterId}
            layout="flex"
            align="center"
            justify="between"
            rounded="xl"
            padding="sm"
            className="border"
            data-section="bughunterleaderboard-div"
          >
            <Span weight="medium">
              #{entry.rank} {entry.hunterName}
            </Span>
            <Span>
              {entry.bugCount} {labels.bugs ?? "bugs"}
            </Span>
          </Div>
        ),
      )}
    </Stack>
  );
}
