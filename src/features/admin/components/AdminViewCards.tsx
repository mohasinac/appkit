"use client";

import React from "react";
import type { AdminListingScaffoldRow } from "./DataListingView";
import { Checkbox, Div, Grid, Row, Span, Stack, Text } from "../../../ui";
import type { StatusTone } from "../../../ui/columns/column-renderers";
import { STATUS_TONE_CLASSES, renderStatusBadge } from "../../../ui/columns/cell-renderers";
import { MediaImage } from "../../media/MediaImage";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
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
  /** Same row-actions menu DataTable renders in its table view — mirrored here so cards carry the same quick actions, not just navigation. */
  renderRowActions?: (row: AdminListingScaffoldRow) => React.ReactNode;
  /** Resource-type emoji fallback for rows without their own `image` (e.g. 👤 for users, 🏪 for stores). */
  resourceIcon?: string;
}

function RowAvatar({ image, alt, icon, size = "9" }: { image?: string; alt: string; icon?: string; size?: "9" | "12" }) {
  const dims = size === "12" ? "h-12 w-12" : "h-9 w-9";
  return (
    <Div className={`relative ${dims} shrink-0`} overflow="hidden" rounded="full">
      <MediaImage src={image} alt={alt} size="avatar" fallback={icon} />
    </Div>
  );
}

/*
 * Flag chips, all drawn from the shared tone map.
 *
 * Three defects lived in the previous literal list:
 *  - `isSold` carried TWO backgrounds and TWO inks on one element
 *    (`bg-…surface … bg-…surface-elevated …`). Tailwind emits all four and
 *    stylesheet order — not string order — decides the winner, so the painted
 *    colour was not what the list said. The identical bug was found and fixed
 *    on the scammer status badge the same week.
 *  - `isPromoted` was raw dual-theme purple (`bg-purple-100 … dark:bg-purple-900/30`),
 *    the hand-written theme branching that variants exist to absorb.
 *  - `featured` repeated its light classes under `dark:`, which is a no-op —
 *    `-surface` tokens already invert with the theme.
 */
const FLAG_BADGES: Array<{ key: keyof AdminListingScaffoldRow; label: string; tone: StatusTone }> = [
  { key: "featured", label: "Featured", tone: "warning" },
  { key: "isPromoted", label: "Promoted", tone: "info" },
  { key: "isOnSale", label: "Sale", tone: "success" },
  // Sold is the absence of availability, not a status outcome — neutral.
  { key: "isSold", label: "Sold", tone: "neutral" },
];

function StatusBadge({ status }: { status: string }) {
  return <>{renderStatusBadge(status)}</>;
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
  renderRowActions,
  resourceIcon,
}: {
  row: AdminListingScaffoldRow;
  view: "grid" | "list";
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  onRowClick?: (row: AdminListingScaffoldRow) => void;
  renderRowActions?: (row: AdminListingScaffoldRow) => React.ReactNode;
  resourceIcon?: string;
}) {
  const flags = FLAG_BADGES.filter(({ key }) => Boolean(row[key]));

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-row-click]')) return;
    onRowClick?.(row);
  };

  if (view === "list") {
    return (
      <Row
        gap="sm"
        className={[
          "px-[var(--appkit-space-4)] py-[var(--appkit-space-3)] cursor-pointer transition-colors hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)]/50",
          selected ? "bg-primary-50/40 dark:bg-primary-900/10" : "",
        ].filter(Boolean).join(" ")}
        onClick={handleClick}
        role={onRowClick ? "button" : undefined}
      >
        {onToggleSelect && (
          <Div data-no-row-click className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(row.id); }}>
            <Checkbox
              bare
              checked={selected}
              onChange={() => onToggleSelect(row.id)}
              className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
              aria-label={`Select ${row.primary}`}
            />
          </Div>
        )}
        <RowAvatar image={row.image} alt={row.primary} icon={resourceIcon} />
        <Stack gap="none" className="flex-1 min-w-0">
          <Text size="sm" weight="semibold" className="truncate" color="primary">{row.primary}</Text>
          <Text size="xs" color="muted" className="truncate">{row.secondary}</Text>
          {row.barcodeId && (
            <Text size="xs" color="faint" className="truncate font-mono">{row.barcodeId}</Text>
          )}
        </Stack>
        {flags.length > 0 && (
          <Row gap="xs" className="hidden sm:flex shrink-0">
            {flags.map(({ key, label, tone }) => (
              <Span padding="pill-2xs" key={key} weight="medium" className={`inline-flex text-[10px] ${STATUS_TONE_CLASSES[tone]}`} rounded="full">{label}</Span>
            ))}
          </Row>
        )}
        <StatusBadge status={row.status} />
        <Span size="xs" color="muted" className="hidden sm:block shrink-0 w-24" align="end">{row.updatedAt}</Span>
        {renderRowActions && (
          <Div data-no-row-click className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {renderRowActions(row)}
          </Div>
        )}
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
          : "border-zinc-100 border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]",
      ].filter(Boolean).join(" ")}
      onClick={handleClick}
      role={onRowClick ? "button" : undefined}
    >
      {onToggleSelect && (
        <Row
          gap="xs"
          data-no-row-click
          paddingY="t-sm" padding="x-sm"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(row.id); }}
        >
          <Checkbox
            bare
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
            aria-label={`Select ${row.primary}`}
          />
          {flags.length > 0 && (
            <Row gap="xs" wrap>
              {flags.map(({ key, label, tone }) => (
                <Span padding="pill-2xs" key={key} weight="medium" className={`inline-flex text-[10px] ${STATUS_TONE_CLASSES[tone]}`} rounded="full">{label}</Span>
              ))}
            </Row>
          )}
        </Row>
      )}
      <Stack gap="xs" className={`${__P.p3}.5`}>
        <Row gap="sm" align="center">
          <RowAvatar image={row.image} alt={row.primary} icon={resourceIcon} size="12" />
          <Stack gap="none" className="min-w-0 flex-1">
            <Text size="sm" weight="semibold" className="line-clamp-2 leading-snug" color="primary">{row.primary}</Text>
            <Text size="xs" color="muted" className="truncate">{row.secondary}</Text>
          </Stack>
        </Row>
        {row.barcodeId && (
          <Text size="xs" color="faint" className="truncate font-mono">{row.barcodeId}</Text>
        )}
        <Row justify="between" gap="xs">
          <StatusBadge status={row.status} />
          <Span color="muted" className="text-[11px] shrink-0">{row.updatedAt}</Span>
        </Row>
        {renderRowActions && (
          <Row
            data-no-row-click
            justify="end"
            gap="xs"
            className="border-t border-[var(--appkit-color-border)] -mx-[var(--appkit-space-3)] -mb-[var(--appkit-space-3)] mt-[var(--appkit-space-1)] px-[var(--appkit-space-3)] py-[var(--appkit-space-2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {renderRowActions(row)}
          </Row>
        )}
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
  renderRowActions,
  resourceIcon,
}: AdminViewCardsProps) {
  if (isLoading) {
    const count = view === "grid" ? 12 : 8;
    if (view === "list") {
      return (
        <Div rounded="xl" border="subtle" className={`${__O.hidden} divide-y divide-zinc-100 divide-[var(--appkit-color-border)]`}>
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
      <Div rounded="xl" border="subtle" className={`${__O.hidden} divide-y divide-zinc-100 divide-[var(--appkit-color-border)]`}>
        {rows.map((row) => (
          <AdminCardItem
            key={row.id}
            row={row}
            view="list"
            selected={selectedIdSet?.has(row.id) ?? false}
            onToggleSelect={onToggleSelect}
            onRowClick={onRowClick}
            renderRowActions={renderRowActions}
            resourceIcon={resourceIcon}
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
          renderRowActions={renderRowActions}
          resourceIcon={resourceIcon}
        />
      ))}
    </Grid>
  );
}
