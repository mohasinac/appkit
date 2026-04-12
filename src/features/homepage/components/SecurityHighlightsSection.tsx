"use client";

import React, { useEffect, useRef, useState } from "react";
import { THEME_CONSTANTS } from "@mohasinac/tokens";
import { Grid, Heading, Section, Span, Text, TextLink } from "@mohasinac/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Single card ─────────────────────────────────────────────────────────────

function SecurityCard({
  item,
  visible,
  delay,
}: {
  item: SecurityHighlightItem;
  visible: boolean;
  delay: number;
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
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {item.renderIcon && (
        <div className="w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center mb-3">
          <span className={iconColorClass} aria-hidden="true">
            {item.renderIcon({ className: "w-6 h-6" })}
          </span>
        </div>
      )}
      <Text className="font-semibold mb-1">{item.title}</Text>
      <Text variant="secondary" className="text-sm leading-relaxed">
        {item.description}
      </Text>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function SecurityHighlightsSection({
  title,
  subtitle,
  pillLabel,
  items,
  learnMoreHref,
  learnMoreLabel = "Learn more →",
  className = "",
}: SecurityHighlightsSectionProps) {
  const { themed } = THEME_CONSTANTS;
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
      className={`py-14 px-4 ${themed.bgPrimary} ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {pillLabel && (
            <Span className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 text-xs font-medium tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm">
              {pillLabel}
            </Span>
          )}
          <Heading
            level={2}
            className={`mt-4 text-3xl md:text-4xl font-bold ${themed.textPrimary}`}
          >
            {title}
          </Heading>
          {subtitle && (
            <Text variant="secondary" className="mt-2 max-w-xl mx-auto">
              {subtitle}
            </Text>
          )}
        </div>

        {/* Cards grid */}
        <Grid gap="none" className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {items.map((item, index) => (
            <SecurityCard
              key={item.key}
              item={item}
              visible={visible}
              delay={index * 100}
            />
          ))}
        </Grid>

        {/* CTA link */}
        {learnMoreHref && (
          <div className="text-center mt-8">
            <TextLink href={learnMoreHref}>{learnMoreLabel}</TextLink>
          </div>
        )}
      </div>
    </Section>
  );
}
