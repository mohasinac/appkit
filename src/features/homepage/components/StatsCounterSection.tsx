"use client"
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Div, Grid, Heading, Row, Section, Text } from "../../../ui";
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
      // audit-inline-style-ok: computed timing
      style={{ transitionDelay: `${delay}ms` }}
    >
      {stat.renderIcon && (
        // audit-variant-ok: icon container — fixed h-14/w-14 + bg-primary-50 + border-primary-100 themed icon-box
        <Row className="mb-4 h-14 w-14 bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/30" align="center" justify="center" rounded="2xl">
          {stat.renderIcon({ className: "w-7 h-7" })}
        </Row>
      )}

      <Heading
        level={2}
        variant="none"
        gradient="brand"
        className="mb-1 font-display font-black" mdSize="5xl" size="4xl"
      >
        {stat.value}
      </Heading>

      <Text
        variant="none"
        className="uppercase tracking-widest" color="muted" size="xs" weight="medium"
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
    <Section border="subtle" paddingY="y-2-5xl"
      ref={sectionRef}
      className={`border-y ${className}`} paddingX="x-md" surface="default"
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
