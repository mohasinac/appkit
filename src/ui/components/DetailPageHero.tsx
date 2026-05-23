"use client";
import React, { type ReactNode } from "react";
import { Div } from "./Div";
import { Row, Stack } from "./Layout";
import { Heading, Text } from "./Typography";

export interface DetailPageHeroProps {
  /** Page H1. */
  title: ReactNode;
  /** Optional eyebrow (breadcrumb / pre-title chip). */
  eyebrow?: ReactNode;
  /** Optional secondary heading (subtitle). */
  subtitle?: ReactNode;
  /** Inline meta row directly below title — typically price + counts + badges. */
  metaRow?: ReactNode;
  /** Long-form description (markdown / plain text). */
  description?: ReactNode;
  /** Slot rendered to the left of the hero text — typically gallery / collage / hero image. */
  mediaSlot?: ReactNode;
  /** Primary CTA(s) rendered at the bottom of the text column. */
  actionsSlot?: ReactNode;
  /** Additional content rendered below `actionsSlot` (e.g. stock indicator, fine print). */
  belowActions?: ReactNode;
  /** Additional classes appended to the outer wrapper. */
  className?: string;
}

/**
 * `DetailPageHero` — the top hero region shared by every listing detail page
 * (Product, Auction, PreOrder, Bundle, PrizeDraw). Renders a 2-column layout:
 * media on the left (~40%), title + meta + description + actions on the right.
 *
 * Slots stay open so domain-specific badges, price components, and CTAs flow
 * through unchanged. W1-14 — extracted 2026-05-23.
 */
export function DetailPageHero({
  title,
  eyebrow,
  subtitle,
  metaRow,
  description,
  mediaSlot,
  actionsSlot,
  belowActions,
  className,
}: DetailPageHeroProps) {
  return (
    <Row
      gap="lg"
      align="start"
      className={[
        "appkit-detail-hero",
        "flex-col md:flex-row",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {mediaSlot ? <Div className="w-full md:w-2/5">{mediaSlot}</Div> : null}

      <Stack gap="md" className="flex-1 min-w-0">
        {eyebrow ? (
          <Div className="text-sm text-zinc-500 dark:text-zinc-400">{eyebrow}</Div>
        ) : null}

        <Heading
          level={1}
          className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </Heading>

        {subtitle ? (
          <Text size="lg" color="muted">
            {subtitle}
          </Text>
        ) : null}

        {metaRow ? <Row gap="sm" align="center" className="flex-wrap">{metaRow}</Row> : null}

        {description ? (
          <Text className="whitespace-pre-line">{description}</Text>
        ) : null}

        {actionsSlot}
        {belowActions}
      </Stack>
    </Row>
  );
}
