"use client"
import React, { useEffect, useRef, useState } from "react";
import { Div } from "../../../ui/components/Div";
import { Grid, Row } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Icon } from "../../../ui/components/Icon";
import { Section } from "../../../ui/components/Semantic";
import type { IconKey } from "../../../ui/icons/icon-registry";
// --- Types -------------------------------------------------------------------

/**
 * 🛑 `renderIcon?: (props) => ReactNode` was removed, not renamed.
 *
 * It was unreachable by construction: every item here comes from a Firestore
 * section config, and a function has no representation in a document — so the
 * section renderer never passed one, and all four tiles fell through to a
 * hardcoded `✓`. Four different promises ("Authenticity checked", "Escrow-backed
 * payments", "Straightforward returns", "Real human support") rendered the same
 * glyph. `iconName` is data, so it survives the document round-trip.
 *
 * `id` is now a separate field because `iconName` used to serve as BOTH the
 * icon and the React key — two indicators sharing an icon produced duplicate
 * keys, and giving the icon a correct default would have made that collision
 * likely rather than rare.
 */
export interface TrustFeatureItem {
  id: string;
  title: string;
  description: string;
  iconName?: IconKey;
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
    <Div
      className={[
        "flex flex-col items-start text-left p-[var(--appkit-space-4)]",
        "transition-all duration-500",
        delayClass,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
     data-section="trustfeaturessection-div-373">
      {/* Icon box. Renders nothing when the stored icon string does not resolve
          — a text-only tile beats one glyph standing in for every promise. */}
      {item.iconName && (
        <Row className="h-14 w-14 bg-primary-50 dark:bg-primary-950/40 border border-[var(--appkit-color-primary-100)] dark:border-[var(--appkit-color-primary-900)]/30 flex-shrink-0" align="center" justify="center" rounded="2xl">
          <Icon name={item.iconName} size="xl" tone="primary" />
        </Row>
      )}

      <Heading
        level={3}
        className="mt-3 mb-1 tracking-wide uppercase" color="primary" size="sm" weight="bold"
      >
        {item.title}
      </Heading>
      <Text className="leading-relaxed" color="muted" size="xs">
        {item.description}
      </Text>
    </Div>
  );
}

// --- Single strip-variant item -----------------------------------------------

function TrustStripItem({ item }: { item: TrustFeatureItem }) {
  return (
    <Div layout="inline-flex" gap="2" align="center" className="flex-shrink-0" padding="x-lg">
      {item.iconName && <Icon name={item.iconName} size="lg" tone="primary" />}
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
            <TrustStripItem key={`${item.id}-${i}`} item={item} />
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
          <Div className="text-left mb-8">
            <Heading
              level={2} color="primary" size="3xl" weight="bold" mdSize="4xl">
              {title}
            </Heading>
          </Div>
        )}
        <Grid cols="statTiles" gap="lg">
          {items.map((item, index) => (
            <TrustFeatureCard
              key={item.id}
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
