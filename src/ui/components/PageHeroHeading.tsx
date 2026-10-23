/**
 * The editorial page header — pill, display heading, rule, subtitle.
 *
 * ## Why this is a component rather than markup in two pages
 *
 * This treatment already existed and was UNREACHABLE. It lived inlined inside
 * `SectionCarousel`, gated on `headingVariant === "editorial"`, so the only
 * surfaces that could use it were homepage rails. `/blog` and `/events` are
 * the two pages the treatment was designed for and they got
 * `<Heading level={1} size="3xl">Blog</Heading>` — one word, no description,
 * no count, no rule — because they had no way to reach it.
 *
 * 🛑 The ornament is `justify="center"` INSIDE a left-aligned parent in the
 * carousel, so the rule floats mid-column away from the heading it belongs to.
 * Here it is aligned with the heading, which is what it was for.
 *
 * Server-safe: no hooks, no DOM, no `"use client"`. A Server Component page
 * can render it directly.
 *
 * @tag layer:ui
 */

import React from "react";
// Each from its DEFINING module, never the `ui` barrel — a barrel import from
// inside `ui/components` is a cycle waiting to happen, and Root Cause #18 is
// the standing rule against convenience re-exports.
import { Div } from "./Div";
import { Row, Stack } from "./Layout";
import { Heading, Span, Text } from "./Typography";

export interface PageHeroHeadingProps {
  /** Small uppercase label above the heading. */
  pill?: string;
  title: string;
  /** One line under the rule. Say what the page is for. */
  description?: string;
  /**
   * A live figure — "4 running now", "25 guides". Rendered beside the pill.
   *
   * 🛑 Pass a real count or nothing. A hardcoded "Hundreds of articles" on a
   * page showing 25 is the kind of claim nobody re-checks when the number
   * moves.
   */
  meta?: string;
  align?: "start" | "center";
  className?: string;
}

const PILL_CLASS =
  "inline-flex items-center gap-[var(--appkit-space-2)] rounded-full " +
  "border border-primary-500/30 bg-primary-500/10 px-[var(--appkit-space-5)] " +
  "py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] font-medium " +
  "tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm";

export function PageHeroHeading({
  pill,
  title,
  description,
  meta,
  align = "start",
  className = "",
}: PageHeroHeadingProps) {
  const alignClass = align === "center" ? "text-center" : "text-left";

  return (
    <Stack gap="xs" className={`${alignClass} ${className}`}>
      {(pill || meta) && (
        <Row align="center" justify={align === "center" ? "center" : "start"} gap="sm" wrap className="mb-3">
          {pill && (
            <Span className={PILL_CLASS}>
              <Span className="w-1.5 h-1.5 bg-primary-500 inline-block" rounded="full" aria-hidden="true" />
              {pill}
              <Span className="w-1.5 h-1.5 bg-primary-500 inline-block" rounded="full" aria-hidden="true" />
            </Span>
          )}
          {meta && (
            <Text size="xs" color="muted" transform="uppercase" className="tracking-widest">
              {meta}
            </Text>
          )}
        </Row>
      )}

      {/*
        * `level={1}` — this IS the page's heading, unlike the carousel's
        * version, which is a section header under the homepage's own h1.
        */}
      <Heading level={1} size="3xl" mdSize="4xl" weight="bold" family="display" className="mb-1">
        {title}
      </Heading>

      {/* The ornament, aligned with the heading rather than floated centre. */}
      <Row
        align="center"
        justify={align === "center" ? "center" : "start"}
        gap="sm"
        textSize="xs"
        color="faint"
        className="mt-1 select-none"
        aria-hidden="true"
      >
        <Span className="h-px w-6 bg-current" />
        <Span size="xs">✶</Span>
        <Span className="h-px w-6 bg-current" />
      </Row>

      {description && (
        <Div className="mt-3 max-w-2xl">
          <Text size="base" color="muted">
            {description}
          </Text>
        </Div>
      )}
    </Stack>
  );
}
