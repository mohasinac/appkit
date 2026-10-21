import React from "react";
import { Div, Heading, Section, Text } from "../../../ui";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";

/**
 * The banner at the top of every prose page.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 *
 * Sixteen views under `features/about/` opened with the same four-line block,
 * and TEN of them were byte-identical:
 *
 *   <Section color="inverse" tone="accent-banner" padding="banner">
 *     <Div className={`${page.container.md} text-center`}>
 *       <Heading color="inverse" level={1} variant="none" className="mb-4">…
 *       <Text color="inverse-muted" variant="none" className="max-w-2xl mx-auto">…
 *
 * The other six differed in exactly three dimensions — container width,
 * whether the text is centred, and `mb-3` versus `mb-4`.
 *
 * (My first count said eleven. The md5 list had ten entries; recounting is
 * cheaper than trusting the number I wrote down — the same lesson as the
 * staged list that had 24 hand-typed entries against a rule's 23.)
 *
 * 🛑 THE `mb-3`/`mb-4` SPLIT IS DRIFT, NOT A DECISION. Nothing distinguishes
 * the pages that got one from the pages that got the other; it is the same
 * shape as the required-marker spacing that differed between `FormField` and
 * the three `Field*` wrappers (four copies of five lines, one of which had
 * been edited). This component picks one — `mb-4`, the majority — and the
 * gap stops being a coincidence held in sixteen places.
 *
 * ── WHY A COMPONENT AND NOT A SHARED LAYOUT ────────────────────────────────
 *
 * The plan asked for "a shared article layout" across the ~45 prose pages.
 * This is the part of that which is genuinely shared: the hero. Below it the
 * sixteen views diverge completely — `FeesView` renders a commission table,
 * `TrackOrderView` a form, `FAQPageView` a filtered accordion — so a wrapper
 * owning the whole page would be a slot-shell with one render prop per page
 * and nothing in common but the banner. That is the duplication framework's
 * "different domain semantics" case; the banner is its "same prop surface"
 * one.
 *
 * @tag domain:about
 * @tag layer:feature
 * @tag access:isomorphic
 */

export interface ProseHeroProps {
  title: React.ReactNode;
  /** Omitted on the pages whose banner is a title alone. */
  subtitle?: React.ReactNode;
  /**
   * Reading measure. `md` (`max-w-4xl`) is the default and what the eleven
   * identical callers used; `sm` (`max-w-3xl`) is the narrower policy/blog
   * measure the rest chose.
   */
  width?: "sm" | "md" | "lg";
  /**
   * 🛑 `true` by default, because most of the sixteen centre their banner
   * and a default that matches the majority is the one that gets reviewed.
   * Pass `false` for the two that deliberately left it ranged left.
   */
  centered?: boolean;
  /** Extra content inside the banner — a form, a filter row, a CTA. */
  children?: React.ReactNode;
}

export function ProseHero({
  title,
  subtitle,
  width = "md",
  centered = true,
  children,
}: ProseHeroProps) {
  return (
    <Section color="inverse" tone="accent-banner" padding="banner">
      <Div
        className={[PAGE_CONTAINER[width], centered ? "text-center" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <Heading color="inverse" level={1} variant="none" className="mb-4">
          {title}
        </Heading>
        {/*
          🛑 `color="inverse-muted"`, NOT `color="inverse"` with a `/80`.
          Every one of these sixteen carried `className="/80 …"` — codemod
          residue from a stripped `text-white/80` — which Tailwind cannot
          generate, so the softening never applied and the subtitle rendered at
          the same full-strength white as the heading above it. Fixed across 28
          sites in this session; the token is what makes it theme-aware, where
          a restored literal white would not be.

          `max-w-2xl mx-auto` stays: the measure is narrower than the
          container so a long subtitle wraps before the heading's width, which
          is a deliberate typographic choice rather than inherited noise.
        */}
        {subtitle && (
          <Text
            color="inverse-muted"
            variant="none"
            className="max-w-2xl mx-auto"
          >
            {subtitle}
          </Text>
        )}
        {children}
      </Div>
    </Section>
  );
}
