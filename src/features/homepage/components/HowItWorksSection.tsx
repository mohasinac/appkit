"use client"
import React, { useEffect, useRef, useState } from "react";
import { THEMED_TEXT_PRIMARY, THEMED_TEXT_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Anchor, Button, Div, Grid, Heading, Icon, Row, Section, Span, Text } from "../../../ui";
import type { IconKey } from "../../../ui";
// --- Constants ---------------------------------------------------------------

const CLS_VISIBLE = "opacity-100 translate-y-0";
const STEP_DELAYS = ["delay-0", "delay-150", "delay-300", "delay-[450ms]"] as const;

// --- Types -------------------------------------------------------------------

/**
 * Promoted to a registered `SectionType` ("how-it-works") 2026-10-19 — see
 * `HowItWorksSectionConfig` in `schemas/firestore.ts`, which this prop shape
 * mirrors exactly (Firestore config must be JSON-serialisable; a function
 * value cannot round-trip through a document write).
 *
 * `renderIcon?: (props) => ReactNode` was the blocker: a function prop has no
 * representation in a Firestore document. Replaced with `iconKey?: IconKey`,
 * rendered through the shared `<Icon>` registry primitive (Root Cause #80) —
 * the same indirection `TrustBadge.iconKey` already uses for this exact
 * problem. `accentFrom` is dropped: declared on the old type, never read
 * anywhere in this component.
 */
export interface HowItWorksStep {
  number: number;
  title: string;
  desc: string;
  iconKey?: IconKey;
  iconColor?: string;
  iconBg?: string;
  badgeBg?: string;
}

export interface HowItWorksSectionProps {
  title: string;
  subtitle?: string;
  pillLabel?: string;
  ctaLabel?: string;
  /**
   * A link, not a handler — `onCtaClick?: () => void` could not survive a
   * Firestore round-trip either. Renders as an `<Anchor>`, matching how every
   * other promoted section's CTA resolves (`EventRafflesSectionConfig`'s
   * `cta`, `FeaturedBundlesSectionConfig`'s `viewMoreLabel` pattern, etc.).
   */
  ctaLink?: string;
  steps: HowItWorksStep[];
  className?: string;
}

// --- Single step card ---------------------------------------------------------

function StepCard({
  step,
  visible,
  delayClass,
}: {
  step: HowItWorksStep;
  visible: boolean;
  delayClass: string;
}) {
  const {
    badgeBg = "bg-primary",
    iconColor = "text-primary",
    iconBg = "bg-primary/5 dark:bg-primary/10",
  } = step;

  return (
    <Div
      className={[
        "relative rounded-3xl p-[var(--appkit-space-8)]",
        "bg-[var(--appkit-color-surface)]",
        "shadow-md group hover:-translate-y-2 hover:shadow-xl",
        "transition-all duration-300",
        delayClass,
        visible ? CLS_VISIBLE : "opacity-0 translate-y-8",
      ].join(" ")}
     data-section="howitworkssection-div-340">
      {/* Step number watermark */}
      <Span
        gradient="brand"
        size="7xl" family="display"
        className="absolute top-4 right-5 opacity-10 select-none pointer-events-none leading-none"
        aria-hidden="true"
      >
        {step.number}
      </Span>

      {/* Visible index badge */}
      <Row textWeight="bold" textSize="sm" 
        className={`relative z-10 w-10 h-10 ${badgeBg} text-white mb-5`} align="center" justify="center" rounded="full" shadow="md"
      >
        {step.number}
      </Row>

      {/* Icon */}
      {step.iconKey && (
        <Row
          className={`relative z-10 w-14 h-14 ${iconBg} mb-4 border border-white/80 dark:border-[var(--appkit-color-border)]`} align="center" justify="center" rounded="2xl"
        >
          <Span className={`${iconColor}`} aria-hidden="true">
            <Icon name={step.iconKey} size="lg" />
          </Span>
        </Row>
      )}

      {/* Text */}
      <Heading
        level={3}
        className={`relative z-10 ${THEMED_TEXT_PRIMARY} mb-2`} size="base" weight="semibold"
      >
        {step.title}
      </Heading>
      <Text
        className={`relative z-10 ${THEMED_TEXT_SECONDARY} leading-relaxed`} size="sm"
      >
        {step.desc}
      </Text>
    </Div>
  );
}

// --- Section -----------------------------------------------------------------

export function HowItWorksSection({
  title,
  subtitle,
  pillLabel,
  ctaLabel,
  ctaLink,
  steps,
  className = "",
}: HowItWorksSectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY, textSecondary: THEMED_TEXT_SECONDARY };
const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Section
      ref={sectionRef}
      className={`${className}`} surface="muted" padding="xl"
    >
      <Div className="max-w-6xl mx-auto">
        {/* Header */}
        <Div
          className={`text-left mb-12 transition-all duration-700 ${
 visible ? CLS_VISIBLE : "opacity-0 translate-y-4"
 }`}
        >
          {pillLabel && (
            <Div layout="inline-flex" gap="2" align="center" textWeight="medium" textSize="xs" className={/* audit-variant-ok: colour+alpha border (primary-500/30); the `border` variant takes a token name, not an rgba step */ "mb-4 border border-primary-500/30 bg-primary-500/10 py-[0.375rem] tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm"} padding="x-md" rounded="full">
              {pillLabel}
            </Div>
          )}

          <Heading
            level={2}
            className={`${themed.textPrimary} mb-3`} size="3xl" mdSize="4xl" weight="bold"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text
              className={`${themed.textSecondary} max-w-xl`} size="base"
            >
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Steps */}
        <Grid
          gap="lg"
          className="grid-cols-1 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 mb-10"
        >
          {steps.map((step, i) => (
            <StepCard
              key={step.number}
              step={step}
              visible={visible}
              delayClass={STEP_DELAYS[Math.min(i, STEP_DELAYS.length - 1)]}
            />
          ))}
        </Grid>

        {/* CTA */}
        {ctaLabel && ctaLink && (
          <Div
            className={`text-left transition-all duration-700 delay-500 ${
 visible ? CLS_VISIBLE : "opacity-0 translate-y-4"
 }`}
          >
            <Button variant="primary" size="lg" asChild>
              <Anchor href={ctaLink} tone="none">{ctaLabel}</Anchor>
            </Button>
          </Div>
        )}
      </Div>
    </Section>
  );
}
