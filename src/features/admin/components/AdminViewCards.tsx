"use client";

import React from "react";
import type { AdminListingScaffoldRow } from "./DataListingView";
import { Div, Grid, Row, Span, Stack, Text } from "../../../ui";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

interface AdminViewCardsProps {
  rows: AdminListingScaffoldRow[];
  view: "grid" | "list";
  isLoading?: boolean;
  emptyLabel?: string;
  onRowClick?: (row: AdminListingScaffoldRow) => void;
  selectedIdSet?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const FLAG_BADGES: Array<{ key: keyof AdminListingScaffoldRow; label: string; color: string }> = [
  { key: "featured", label: "Featured", color: "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning" },
  { key: "isPromoted", label: "Promoted", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { key: "isOnSale", label: "Sale", color: "bg-success-surface text-success" },
  { key: "isSold", label: "Sold", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <Span size="xs" weight="medium" className="inline-flex bg-primary-50 text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300 truncate max-w-[120px]" rounded="full" padding="pill-xs">
      {status}
    </Span>
  );
}

function SkeletonCard({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <Row gap="sm" className="animate-pulse" padding="inline">
        <Div className="h-4 w-4 shrink-0" surface="subtle" rounded="default" />
        <Stack gap="xs" className="flex-1">
          <Div className="h-3 w-2/3" surface="subtle" rounded="default" />
          <Div className="h-2.5 w-1/3" surface="subtle" rounded="default" />
        </Stack>
        <Div className="h-5 w-16 shrink-0" surface="subtle" rounded="full" />
        <Div className="h-3 w-20 shrink-0" surface="subtle" rounded="default" />
      </Row>
    );
  }
  return (
    <Div rounded="xl" border="subtle" className={`${__O.hidden} animate-pulse`}>
      <Stack gap="xs" padding="md">
        <Div className="h-4 w-3/4" surface="subtle" rounded="default" />
        <Div className="h-3 w-1/2" surface="subtle" rounded="default" />
        <Div className="h-5 w-20 mt-1" surface="subtle" rounded="full" />
        <Div className="h-3 w-1/3" surface="subtle" rounded="default" />
      </Stack>
    </Div>
  );
}

function AdminCardItem({
  row,
  view,
  selected,
  onToggleSelect,
  onRowClick,
}: {
  row: AdminListingScaffoldRow;
  view: "grid" | "list";
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  onRowClick?: (row: AdminListingScaffoldRow) => void;
}) {
  const flags = FLAG_BADGES.filter(({ key }) => Boolean(row[key]));

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
    onRowClick?.(row);
  };

  if (view === "list") {
    return (
      <Row
        gap="sm"
        className={[
          "px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-slate-800/50",
          selected ? "bg-primary-50/40 dark:bg-primary-900/10" : "",
        ].filter(Boolean).join(" ")}
        onClick={handleClick}
        role={onRowClick ? "button" : undefined}
      >
        {onToggleSelect && (
          <Div data-checkbox className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(row.id); }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(row.id)}
              className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
              aria-label={`Select ${row.primary}`}
            />
          </Div>
        )}
        <Stack gap="none" className="flex-1 min-w-0">
          <Text size="sm" weight="semibold" className="truncate" color="primary">{row.primary}</Text>
          <Text size="xs" color="muted" className="truncate">{row.secondary}</Text>
        </Stack>
        {flags.length > 0 && (
          <Row gap="xs" className="hidden sm:flex shrink-0">
            {flags.map(({ key, label, color }) => (
              <Span key={key} weight="medium" className={`inline-flex px-1.5 py-0.5 text-[10px] ${color}`} rounded="full">{label}</Span>
            ))}
          </Row>
        )}
        <StatusBadge status={row.status} />
        <Span size="xs" color="muted" className="hidden sm:block shrink-0 w-24" align="end">{row.updatedAt}</Span>
      </Row>
    );
  }

  return (
    <Div
      rounded="xl"
      className={[
        "border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        selected
          ? "border-primary ring-1 ring-primary/20 bg-primary-50/30 dark:bg-primary-900/10"
          : "border-zinc-100 dark:border-slate-700 bg-white dark:bg-slate-900",
      ].filter(Boolean).join(" ")}
      onClick={handleClick}
      role={onRowClick ? "button" : undefined}
    >
      {onToggleSelect && (
        <Row
          gap="xs"
          data-checkbox
          className="pt-3" padding="x-sm"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(row.id); }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
            aria-label={`Select ${row.primary}`}
          />
          {flags.length > 0 && (
            <Row gap="xs" wrap>
              {flags.map(({ key, label, color }) => (
                <Span key={key} weight="medium" className={`inline-flex px-1.5 py-0.5 text-[10px] ${color}`} rounded="full">{label}</Span>
              ))}
            </Row>
          )}
        </Row>
      )}
      <Stack gap="xs" className={`${__P.p3}.5`}>
        <Stack gap="none">
          <Text size="sm" weight="semibold" className="line-clamp-2 leading-snug" color="primary">{row.primary}</Text>
          <Text size="xs" color="muted" className="truncate">{row.secondary}</Text>
        </Stack>
        <Row justify="between" gap="xs">
          <StatusBadge status={row.status} />
          <Span color="muted" className="text-[11px] shrink-0">{row.updatedAt}</Span>
        </Row>
      </Stack>
    </Div>
  );
}

export function AdminViewCards({
  rows,
  view,
  isLoading,
  emptyLabel = "No items found",
  onRowClick,
  selectedIdSet,
  onToggleSelect,
}: AdminViewCardsProps) {
  if (isLoading) {
    const count = view === "grid" ? 12 : 8;
    if (view === "list") {
      return (
        <Div rounded="xl" border="subtle" className={`${__O.hidden} divide-y divide-zinc-100 dark:divide-slate-700`}>
          {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} view="list" />)}
        </Div>
      );
    }
    return (
      <Grid gap="md" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} view="grid" />)}
      </Grid>
    );
  }

  if (rows.length === 0) {
    return (
      <Text paddingY="3xl" size="sm" color="muted" align="center">{emptyLabel}</Text>
    );
  }

  if (view === "list") {
    return (
      <Div rounded="xl" border="subtle" className={`${__O.hidden} divide-y divide-zinc-100 dark:divide-slate-700`}>
        {rows.map((row) => (
          <AdminCardItem
            key={row.id}
            row={row}
            view="list"
            selected={selectedIdSet?.has(row.id) ?? false}
            onToggleSelect={onToggleSelect}
            onRowClick={onRowClick}
          />
        ))}
      </Div>
    );
  }

  return (
    <Grid gap="md" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => (
        <AdminCardItem
          key={row.id}
          row={row}
          view="grid"
          selected={selectedIdSet?.has(row.id) ?? false}
          onToggleSelect={onToggleSelect}
          onRowClick={onRowClick}
        />
      ))}
    </Grid>
  );
}
