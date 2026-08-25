"use client";

/**
 * RecordDetailModal — the shared "open one listing row and actually read it"
 * surface.
 *
 * Built 2026-08-21 when `audit-listing-detail-affordance` found 16 of 70
 * dashboard listing views were dead ends: rows the user could see but never
 * open. Two distinct failure shapes, both fixed by this one primitive:
 *
 *  1. Data fetched then discarded — AdminCartsView/AdminWishlistsView/
 *     AdminHistoryView all compute `items.length` for the row subtitle and
 *     throw the `items[]` array itself away, with no surface to show it
 *     (CLAUDE.md Recurrent Root Cause #52).
 *  2. Acting blind — AdminCatalogueApprovalsView offers Approve/Reject, and
 *     AdminTesterFeedbackListView offers "Confirm bug", on records whose
 *     content (photos, description, the tester's comment/screenshot) was
 *     never rendered anywhere.
 *
 * Sixteen bespoke modals would have tripped the Duplication Decision
 * Framework's Rule of Three immediately, so this is deliberately one
 * primitive with three optional content slots — `fields` (definition rows),
 * `items` (a thumbnail list, the Root Cause #52 fix), and `metadata` (a raw
 * JSON payload dump) — rather than a per-feature component each time.
 *
 * Consumers pass plain data, not JSX, so a listing view's detail wiring stays
 * the ~20-line "map the raw row into fields/items" shape at every call site.
 */

import type { ReactNode } from "react";
import { Anchor, Badge, Code, Div, Modal, Row, Stack, Text } from "../index";
import { MediaImage } from "../../features/media/MediaImage";
import type { JsonValue } from "../../schemas/types";

export interface RecordDetailField {
  label: string;
  /** Rendered as-is when a node; plain strings/numbers get default styling. */
  value: ReactNode;
}

export interface RecordDetailItem {
  /** Thumbnail URL — falls back to MediaImage's placeholder when absent. */
  image?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned trailing text (price, quantity, timestamp). */
  trailing?: string;
  /** When set, the title becomes a link to this record's own detail page. */
  href?: string;
}

export interface RecordDetailBadge {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "secondary";
}

export interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Small status chips under the title (status, read-state, role, etc). */
  badges?: RecordDetailBadge[];
  /** Free-text lead paragraph — a comment body, description, or message. */
  description?: string;
  /** Definition rows: the record's scalar fields. */
  fields?: RecordDetailField[];
  /** A nested collection on the record (cart items, wishlist entries, …). */
  items?: { heading: string; entries: RecordDetailItem[] };
  /**
   * Rich content rendered between `items` and `metadata` — a timeline rail, a
   * chart, anything that is neither a scalar field nor a raw payload.
   *
   * `footer` cannot host this: that slot is an action-button row wrapped in
   * `<Row justify="end">`, so a full-width block placed there is squeezed to
   * the right and reads as a control.
   */
  extra?: ReactNode;
  /** Raw payload dump for records that carry an open-ended object. */
  metadata?: Record<string, JsonValue>;
  /** Action buttons rendered at the bottom (approve/reject/etc). */
  footer?: ReactNode;
}

export function RecordDetailModal({
  isOpen,
  onClose,
  title,
  badges,
  description,
  fields,
  items,
  extra,
  metadata,
  footer,
}: RecordDetailModalProps) {
  const hasMetadata = Boolean(metadata && Object.keys(metadata).length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <Stack gap="md">
        {badges && badges.length > 0 && (
          <Row gap="sm" align="center" wrap>
            {badges.map((b) => (
              <Badge key={b.label} variant={b.variant ?? "default"}>
                {b.label}
              </Badge>
            ))}
          </Row>
        )}

        {description && (
          <Div rounded="lg" padding="sm" surface="muted" border="default">
            <Text size="sm">{description}</Text>
          </Div>
        )}

        {fields && fields.length > 0 && (
          <Stack gap="xs">
            {fields.map((f) => (
              <Row key={f.label} justify="between" gap="md">
                <Text size="sm" color="muted">{f.label}</Text>
                <Text size="sm" weight="medium" className="text-right">{f.value}</Text>
              </Row>
            ))}
          </Stack>
        )}

        {items && items.entries.length > 0 && (
          <Stack gap="xs">
            <Text size="xs" weight="semibold" color="muted">
              {items.heading} ({items.entries.length})
            </Text>
            <Div
              className="divide-y divide-[var(--appkit-color-border)] border border-[var(--appkit-color-border)]"
              rounded="lg"
            >
              {items.entries.map((entry, i) => (
                <Row
                  key={`${entry.title}-${i}`}
                  gap="sm"
                  align="center"
                  justify="between"
                  paddingY="y-xs-tall"
                  padding="x-sm"
                >
                  <Row gap="sm" align="center" className="min-w-0">
                    <Div className="h-10 w-10 shrink-0" rounded="md" overflow="hidden">
                      <MediaImage src={entry.image} alt={entry.title} size="thumbnail" />
                    </Div>
                    <Stack gap="none" className="min-w-0">
                      {entry.href ? (
                        <Anchor href={entry.href} tone="brand" size="sm" weight="medium">
                          {entry.title}
                        </Anchor>
                      ) : (
                        <Text size="sm" weight="medium" className="truncate">
                          {entry.title}
                        </Text>
                      )}
                      {entry.subtitle && (
                        <Text size="xs" color="muted">{entry.subtitle}</Text>
                      )}
                    </Stack>
                  </Row>
                  {entry.trailing && (
                    <Text size="sm" weight="medium" className="shrink-0">
                      {entry.trailing}
                    </Text>
                  )}
                </Row>
              ))}
            </Div>
          </Stack>
        )}

        {extra}

        {hasMetadata && (
          <Div rounded="lg" padding="sm" surface="muted" border="default">
            <Text size="xs" weight="semibold" color="muted" className="mb-1">Details</Text>
            <Code size="xs" className="block whitespace-pre-wrap font-mono">
              {JSON.stringify(metadata, null, 2)}
            </Code>
          </Div>
        )}

        {footer && <Row justify="end" gap="sm">{footer}</Row>}
      </Stack>
    </Modal>
  );
}
