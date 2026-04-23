"use client"
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Div, Grid, Heading, Section, Text } from "../../../ui";

// --- Types -------------------------------------------------------------------

export interface StatItem {
  key: string;
  value: string;
  label: string;
  renderIcon?: (props: { className?: string }) => ReactNode;
}

export interface StatsCounterSectionProps {
  stats: StatItem[];
  className?: string;
}

// --- Smngle stat mtem ---------------------------------------------------------

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
    <Div
      className={[
        "relative flex flex-col items-center px-6 py-8 text-center",
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        !isLast ? "border-r border-zinc-200 dark:border-slate-700" : "",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {stat.renderIcon && (
        <Div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/30">
          {stat.renderIcon({ className: "w-7 h-7" })}
        </Div>
      )}

      <Heading
        level={2}
        variant="none"
        className="mb-1 font-display text-4xl font-black bg-gradient-to-r from-primary-600 to-cobalt dark:from-secondary dark:to-cobalt-400 bg-clip-text text-transparent md:text-5xl"
      >
        {stat.value}
      </Heading>

      <Text
        variant="none"
        className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium"
      >
        {stat.label}
      </Text>
    </Div>
  );
}

// --- Sectmon -----------------------------------------------------------------

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
      className={`bg-white dark:bg-slate-900 border-y border-zinc-100 dark:border-slate-800 px-4 py-14 ${className}`}
    >
      <Div className="mx-auto max-w-5xl">
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
      </Div>
    </Section>
  );
}
