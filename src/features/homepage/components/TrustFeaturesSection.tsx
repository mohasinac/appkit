"use client"
import React, { useEffect, useRef, useState } from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Grid, Heading, Section, Span, Text } from "../../../ui";

// --- Types -------------------------------------------------------------------

export interface TrustFeatureItem {
  iconName: string;
  title: string;
  description: string;
  renderIcon?: (props: { className?: string }) => React.ReactNode;
}

export interface TrustFeaturesSectionProps {
  items: TrustFeatureItem[];
  title?: string;
  variant?: "cards" | "strip";
  className?: string;
}

// --- Single cards-variant card -----------------------------------------------

function TrustFeatureCard({
  item,
  visible,
  delay,
}: {
  item: TrustFeatureItem;
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center text-center p-4",
        "transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Icon box */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/30 flex-shrink-0">
        {item.renderIcon ? (
          item.renderIcon({ className: "w-7 h-7" })
        ) : (
          <Span
            className="text-primary-600 dark:text-secondary-400 text-2xl"
            aria-hidden="true"
          >
            ✓
          </Span>
        )}
      </div>

      <Heading
        level={3}
        className="mt-3 mb-1 text-sm font-bold tracking-wide uppercase text-zinc-900 dark:text-zinc-100"
      >
        {item.title}
      </Heading>
      <Text className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {item.description}
      </Text>
    </div>
  );
}

// --- Single strip-variant item -----------------------------------------------

function TrustStripItem({ item }: { item: TrustFeatureItem }) {
  return (
    <div className="inline-flex flex-shrink-0 items-center gap-2 px-6">
      {item.renderIcon ? (
        item.renderIcon({ className: "w-5 h-5" })
      ) : (
        <Span
          className="text-primary-600 dark:text-primary-400 text-lg"
          aria-hidden="true"
        >
          ✓
        </Span>
      )}
      <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
        {item.title}
      </Text>
    </div>
  );
}

// --- Section -----------------------------------------------------------------

export function TrustFeaturesSection({
  items,
  title,
  variant = "cards",
  className = "",
}: TrustFeaturesSectionProps) {
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

  if (variant === "strip") {
    const doubled = [...items, ...items];
    return (
      <Section
        ref={sectionRef}
        className={`py-4 overflow-hidden border-y border-zinc-100 dark:border-slate-800 ${className}`}
      >
        <div className="flex animate-marquee">
          {doubled.map((item, i) => (
            <TrustStripItem key={`${item.iconName}-${i}`} item={item} />
          ))}
        </div>
      </Section>
    );
  }

  return (
    <Section
      ref={sectionRef}
      className={`py-14 px-4 bg-zinc-50 dark:bg-slate-900/80 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {title && (
          <div className="text-center mb-8">
            <Heading
              level={2}
              className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </Heading>
          </div>
        )}
        <Grid
          gap="lg"
          className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
        >
          {items.map((item, index) => (
            <TrustFeatureCard
              key={item.iconName}
              item={item}
              visible={visible}
              delay={index * 100}
            />
          ))}
        </Grid>
      </div>
    </Section>
  );
}
