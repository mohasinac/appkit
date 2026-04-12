"use client";

import React, { useEffect, useRef, useState } from "react";
import { THEME_CONSTANTS } from "@mohasinac/tokens";
import { Grid, Heading, Section, Text } from "@mohasinac/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StatItem {
  key: string;
  value: string;
  label: string;
  renderIcon?: (props: { className?: string }) => React.ReactNode;
}

export interface StatsCounterSectionProps {
  stats: StatItem[];
  className?: string;
}

// ─── Single stat item ─────────────────────────────────────────────────────────

function StatCard({
  stat,
  visible,
  delay,
  isLast,
}: {
  stat: StatItem;
  visible: boolean;
  delay: number;
  isLast: boolean;
}) {
  return (
    <div
      className={[
        "relative flex flex-col items-center text-center px-6 py-8",
        "transition-all duration-700",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        !isLast ? "md:border-r border-cobalt-200 dark:border-white/10" : "",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Icon wrapper */}
      {stat.renderIcon && (
        <div className="w-14 h-14 rounded-2xl bg-cobalt-100 dark:bg-white/10 backdrop-blur flex items-center justify-center mb-4">
          {stat.renderIcon({ className: "w-7 h-7" })}
        </div>
      )}

      {/* Stat value */}
      <Heading
        level={2}
        variant="none"
        className="font-display text-4xl md:text-5xl text-zinc-900 dark:text-white mb-1"
      >
        {stat.value}
      </Heading>

      {/* Label */}
      <Text
        variant="none"
        className="text-zinc-500 dark:text-white/60 text-sm uppercase tracking-widest"
      >
        {stat.label}
      </Text>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function StatsCounterSection({
  stats,
  className = "",
}: StatsCounterSectionProps) {
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
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Section
      ref={sectionRef}
      className={`bg-gradient-to-br from-cobalt-50 via-zinc-50 to-cobalt-50 dark:from-cobalt-900 dark:via-slate-900 dark:to-cobalt-950 py-12 px-4 ${className}`}
    >
      <div className="max-w-5xl mx-auto">
        <Grid
          gap="none"
          className="grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <StatCard
              key={stat.key}
              stat={stat}
              visible={visible}
              delay={i * 120}
              isLast={i === stats.length - 1}
            />
          ))}
        </Grid>
      </div>
    </Section>
  );
}
