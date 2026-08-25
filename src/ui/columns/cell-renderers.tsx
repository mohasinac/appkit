"use client";

/*
 * WHY: `column-renderers.ts:7` has said *"For JSX renderers (badge, thumbnail,
 *      action buttons) see `column-renderers.tsx`"* since the module was
 *      written. **That file never existed** — and it never could have: TypeScript
 *      emits `column-renderers.ts` and `column-renderers.tsx` to the SAME
 *      `column-renderers.js`, so adding it fails the build with TS5056. The
 *      forward reference named a file that was impossible to create, which may
 *      well be why nobody ever did. This module is that file under a name the
 *      compiler allows; the stale reference in the `.ts` now points here.
 *
 *      The consequence is the "bland admin" report: `DataTable` falls back to
 *      `String(value)` for any column without a hand-written `render`, so a
 *      status is grey text, a price is `1499`, a date is a raw ISO string and
 *      an image column is empty. Every table that wanted better re-implemented
 *      it locally — `DataTable.tsx` and `AdminViewCards.tsx` each carry their
 *      own copy of the tone→class map, and they had already drifted in the
 *      `neutral` case.
 *
 * WHAT: The JSX half of the column renderers, and the ONE tone→class map.
 *
 * ## Colour follows the two legal pairings, and nothing else
 *
 * Recurrent Root Cause #67: an inline chip is `bg-{status}-surface` +
 * `text-{status}` — both tokens invert together with the theme. A literal
 * `text-white` is invisible in exactly one theme, and `danger-*` is a flat
 * alias Tailwind never generates. `audit-status-color-pairs` blocks both.
 *
 * `neutral` deliberately does NOT use a status colour: it is the absence of a
 * status, not a state. The previous copies used
 * `bg-primary-50 text-primary-800 dark:bg-secondary-900/30 …` — a raw
 * dual-theme className, which is the thing variants exist to absorb.
 *
 * ## Thumbnails need a DEFINITE size
 *
 * Root Cause #68: a `<MediaImage>` resolves `w-full h-full` against its
 * parent, so inside a shrink-to-fit box it computes to 0×0 and nine surfaces
 * went blank at once. Every thumbnail here sits in an explicitly-sized box.
 *
 * EXPORTS:
 *   STATUS_TONE_CLASSES, renderStatusBadge, renderThumbnail, renderAvatar,
 *   renderMoney, renderRelativeDate, renderBooleanIcon, renderCountPill,
 *   renderTypeChip
 *
 * @tag domain:ui
 * @tag layer:component
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:DataTable,AdminViewCards,buildColumns
 * @tag sideEffects:none
 */

import React from "react";
import { Badge } from "../components/Badge";
import { Row, Stack } from "../components/Layout";
import { Div } from "../components/Div";
import { Span, Text } from "../components/Typography";
import { MediaImage } from "../../features/media/MediaImage";
import { getStatusTone, renderCurrency, type StatusTone } from "./column-renderers";
import { listingBadgeVariant } from "../../features/products/utils/listing-badge-variant";

/**
 * The single tone→class map.
 *
 * Previously duplicated verbatim in `features/admin/components/DataTable.tsx`
 * and `AdminViewCards.tsx`. Both are now consumers of this one.
 */
export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  error: "bg-error-surface text-error",
  info: "bg-info-surface text-info",
  // Not a status colour — see the header.
  neutral:
    "bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text-muted)]",
};

/** A status string as a themed chip. Unknown statuses render neutral, not invisible. */
export function renderStatusBadge(
  status: string | null | undefined,
  opts?: { emptyLabel?: string },
): React.ReactNode {
  const label = status ?? opts?.emptyLabel ?? "—";
  const tone = getStatusTone(status);
  return (
    <Span
      size="xs"
      weight="medium"
      rounded="full"
      padding="pill-sm-tall"
      className={`inline-flex whitespace-nowrap ${STATUS_TONE_CLASSES[tone]}`}
    >
      {label}
    </Span>
  );
}

const THUMB_SIZE = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

/**
 * A row thumbnail in an explicitly-sized box.
 *
 * `fallback` takes the resource emoji from `getResourceIcon`, so a row with no
 * image still has a visual anchor rather than an empty cell.
 */
export function renderThumbnail(
  src: string | null | undefined,
  alt: string,
  opts?: { size?: keyof typeof THUMB_SIZE; fallback?: string; rounded?: "full" | "md" },
): React.ReactNode {
  const size = opts?.size ?? "sm";
  return (
    <Div
      className={`relative shrink-0 ${THUMB_SIZE[size]}`}
      overflow="hidden"
      rounded={opts?.rounded ?? "md"}
    >
      <MediaImage src={src ?? undefined} alt={alt} size="avatar" fallback={opts?.fallback} />
    </Div>
  );
}

/** A person: round thumbnail + name, with an optional secondary line. */
export function renderAvatar(
  name: string,
  opts?: { photoURL?: string | null; secondary?: string | null; fallback?: string },
): React.ReactNode {
  return (
    <Row gap="sm" align="center">
      {renderThumbnail(opts?.photoURL, name, { rounded: "full", fallback: opts?.fallback })}
      <Stack gap="none" className="min-w-0">
        <Text weight="medium" color="primary" className="truncate">
          {name}
        </Text>
        {opts?.secondary ? (
          <Text size="xs" color="muted" className="truncate">
            {opts.secondary}
          </Text>
        ) : null}
      </Stack>
    </Row>
  );
}

/** Money, right-aligned and tabular so columns of figures line up. */
export function renderMoney(
  amount: number | null | undefined,
  opts?: { currency?: string; locale?: string },
): React.ReactNode {
  return (
    <Span size="sm" numeric className="whitespace-nowrap">
      {renderCurrency(amount, opts?.currency, opts?.locale)}
    </Span>
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Thresholds, ordered ascending — a table rather than an if/else chain so a new
 * granularity is one row, and so the ordering is visible at a glance.
 */
const RELATIVE_STEPS: Array<{ under: number; format: (abs: number, suffix: string) => string }> = [
  { under: MINUTE, format: () => "just now" },
  { under: HOUR, format: (abs, suffix) => `${Math.round(abs / MINUTE)}m ${suffix}` },
  { under: DAY, format: (abs, suffix) => `${Math.round(abs / HOUR)}h ${suffix}` },
  { under: 30 * DAY, format: (abs, suffix) => `${Math.round(abs / DAY)}d ${suffix}` },
];


/**
 * "2 days ago", with the full timestamp on hover.
 *
 * Takes `now` so it is testable and so a table full of dates shares one clock
 * rather than drifting cell to cell.
 */
export function renderRelativeDate(
  value: Date | string | number | null | undefined,
  opts?: { now?: Date; emptyLabel?: string },
): React.ReactNode {
  if (value == null || value === "") {
    return (
      <Span size="sm" color="muted">
        {opts?.emptyLabel ?? "—"}
      </Span>
    );
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    // A malformed date renders as an em-dash rather than "Invalid Date".
    return (
      <Span size="sm" color="muted">
        {opts?.emptyLabel ?? "—"}
      </Span>
    );
  }
  const diff = (opts?.now ?? new Date()).getTime() - date.getTime();
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "ago" : "from now";

  const step = RELATIVE_STEPS.find((s) => abs < s.under);
  // Past ~a month, a relative label stops being useful — show the real date.
  const label = step ? step.format(abs, suffix) : date.toLocaleDateString();

  return (
    <Span size="sm" color="muted" className="whitespace-nowrap" title={date.toLocaleString()}>
      {label}
    </Span>
  );
}

/** ✓ / ✗ instead of the words "true"/"false". */
export function renderBooleanIcon(value: boolean | null | undefined): React.ReactNode {
  return value ? (
    <Span size="sm" className="text-success" aria-label="Yes">
      ✓
    </Span>
  ) : (
    <Span size="sm" color="muted" aria-label="No">
      ✗
    </Span>
  );
}

/** A count as a pill. Zero renders muted rather than shouting. */
export function renderCountPill(
  count: number | null | undefined,
  opts?: { label?: string },
): React.ReactNode {
  const n = count ?? 0;
  const suffix = opts?.label ? ` ${opts.label}` : "";
  return (
    <Span
      size="xs"
      weight="medium"
      rounded="full"
      padding="pill-sm-tall"
      numeric
      className={`inline-flex whitespace-nowrap ${
        n > 0 ? STATUS_TONE_CLASSES.info : STATUS_TONE_CLASSES.neutral
      }`}
    >
      {n.toLocaleString()}
      {suffix}
    </Span>
  );
}

/**
 * A listing type as its registry badge.
 *
 * Goes through `listingBadgeVariant()`, not `LISTING_BADGE_VARIANT[kind]` — the
 * accessor tolerates a non-`ListingType` string (a raw API value, a UI
 * sentinel like `"all"`) while the map itself stays exhaustively typed, so a
 * new listing type is a compile error there rather than a silent fallthrough.
 */
export function renderTypeChip(
  listingType: string | null | undefined,
  opts?: { label?: string },
): React.ReactNode {
  if (!listingType) return null;
  return (
    <Badge variant={listingBadgeVariant(listingType)}>{opts?.label ?? listingType}</Badge>
  );
}
