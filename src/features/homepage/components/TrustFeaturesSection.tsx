"use client"
import React, { useEffect, useRef, useState } from "react";
import { Div, Grid, Heading, Row, Section, Span, Text } from "../../../ui";
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

// --- Constants ---------------------------------------------------------------

const CARD_DELAYS = ["delay-0", "delay-100", "delay-200", "delay-300", "delay-[400ms]", "delay-500"] as const;

// --- Single cards-variant card -----------------------------------------------

function TrustFeatureCard({
  item,
  visible,
  delayClass,
}: {
  item: TrustFeatureItem;
  visible: boolean;
  delayClass: string;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center text-center p-4",
        "transition-all duration-500",
        delayClass,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
     data-section="trustfeaturessection-div-373">
      {/* Icon box */}
      <Row className="h-14 w-14 bg-primary-50 dark:bg-primary-950/40 border border-[var(--appkit-color-primary-100)] dark:border-[var(--appkit-color-primary-900)]/30 flex-shrink-0" align="center" justify="center" rounded="2xl">
        {item.renderIcon ? (
          item.renderIcon({ className: "w-7 h-7" })
        ) : (
          <Span
            className="text-primary-600 dark:text-secondary-400" size="2xl"
            aria-hidden="true"
          >
            ✓
          </Span>
        )}
      </Row>

      <Heading
        level={3}
        className="mt-3 mb-1 tracking-wide uppercase" color="primary" size="sm" weight="bold"
      >
        {item.title}
      </Heading>
      <Text className="leading-relaxed" color="muted" size="xs">
        {item.description}
      </Text>
    </div>
  );
}

// --- Single strip-variant item -----------------------------------------------

function TrustStripItem({ item }: { item: TrustFeatureItem }) {
  return (
    <Div layout="inline-flex" gap="2" align="center" className="flex-shrink-0" padding="x-lg">
      {item.renderIcon ? (
        item.renderIcon({ className: "w-5 h-5" })
      ) : (
        <Span
          className="text-primary-600 dark:text-primary-400" size="lg"
          aria-hidden="true"
        >
          ✓
        </Span>
      )}
      <Text className="whitespace-nowrap" color="muted" size="sm" weight="medium">
        {item.title}
      </Text>
    </Div>
  );
}

// --- Section -----------------------------------------------------------------

export function TrustFeaturesSection({
  items,
  title,
  variant = "cards",
  className = "",
}: TrustFeaturesSectionProps) {
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
      <Section border="subtle" 
        ref={sectionRef}
        className={`overflow-hidden border-y ${className}`} padding="y-md"
      >
        <Div layout="flex" className="animate-marquee">
          {doubled.map((item, i) => (
            <TrustStripItem key={`${item.iconName}-${i}`} item={item} />
          ))}
        </Div>
      </Section>
    );
  }

  return (
    <Section
      ref={sectionRef}
      paddingY="y-2-5xl" className={className} paddingX="x-md" surface="muted"
    >
      <Div className="max-w-6xl mx-auto">
        {title && (
          <Div className="text-center mb-8">
            <Heading
              level={2} color="primary" size="3xl" weight="bold" mdSize="4xl">
              {title}
            </Heading>
          </Div>
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
              delayClass={CARD_DELAYS[Math.min(index, CARD_DELAYS.length - 1)]}
            />
          ))}
        </Grid>
      </Div>
    </Section>
  );
}
