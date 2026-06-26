"use client"
import React, { useEffect, useRef, useState } from "react";
import { THEMED_TEXT_PRIMARY } from "../../../_internal/shared/styles/themed";
import { Div, Grid, Heading, Row, Section, Span, Text, TextLink } from "../../../ui";
// --- Types -------------------------------------------------------------------

export interface SecurityHighlightItem {
  key: string;
  title: string;
  description: string;
  renderIcon?: (props: { className?: string }) => React.ReactNode;
  colorClass?: string;
  iconColorClass?: string;
}

export interface SecurityHighlightsSectionProps {
  title: string;
  subtitle?: string;
  pillLabel?: string;
  items: SecurityHighlightItem[];
  learnMoreHref?: string;
  learnMoreLabel?: string;
  className?: string;
}

// --- Constants ---------------------------------------------------------------

const CARD_DELAYS = ["delay-0", "delay-100", "delay-200", "delay-300", "delay-[400ms]", "delay-500"] as const;

// --- Single card -------------------------------------------------------------

function SecurityCard({
  item,
  visible,
  delayClass,
}: {
  item: SecurityHighlightItem;
  visible: boolean;
  delayClass: string;
}) {
  const colorClass =
    item.colorClass ??
    "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30";
  const iconColorClass = item.iconColorClass ?? "text-primary";

  return (
    <div
      className={[
        "rounded-xl border p-5 transition-all duration-500",
        colorClass,
        delayClass,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
     data-section="securityhighlightssection-div-357">
      {item.renderIcon && (
        <Row className="w-10 h-10 mb-3" surface="default" align="center" justify="center" rounded="lg">
          <Span className={iconColorClass} aria-hidden="true">
            {item.renderIcon({ className: "w-6 h-6" })}
          </Span>
        </Row>
      )}
      <Text className="mb-1" weight="semibold">{item.title}</Text>
      <Text variant="secondary" className="leading-relaxed" size="sm">
        {item.description}
      </Text>
    </div>
  );
}

// --- Section -----------------------------------------------------------------

export function SecurityHighlightsSection({
  title,
  subtitle,
  pillLabel,
  items,
  learnMoreHref,
  learnMoreLabel = "Learn more →",
  className = "",
}: SecurityHighlightsSectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY };
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
      paddingY="y-2-5xl" className={className} surface="muted" paddingX="x-md"
    >
      <Div className="max-w-6xl mx-auto">
        {/* Header */}
        <Div className="text-center mb-10">
          {pillLabel && (
            <Span layout="inline-flex" gap="md" size="xs" weight="medium" className="border border-primary-[500]/30 bg-primary-500/10 px-[1.25rem] py-[0.375rem] tracking-[0.2em] text-primary-700 dark:text-primary-400 backdrop-blur-sm" rounded="full" transform="uppercase">
              {pillLabel}
            </Span>
          )}
          <Heading
            level={2}
            className={`mt-4 ${themed.textPrimary}`} size="3xl" mdSize="4xl" weight="bold"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text variant="secondary" className="mt-2 max-w-xl mx-auto">
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Cards grid */}
        <Grid
          gap="xl"
          className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        >
          {items.map((item, index) => (
            <SecurityCard
              key={item.key}
              item={item}
              visible={visible}
              delayClass={CARD_DELAYS[Math.min(index, CARD_DELAYS.length - 1)]}
            />
          ))}
        </Grid>

        {/* CTA link */}
        {learnMoreHref && (
          <Div className="text-center mt-8">
            <TextLink href={learnMoreHref}>{learnMoreLabel}</TextLink>
          </Div>
        )}
      </Div>
    </Section>
  );
}
