import React from "react";
import { Heading, HorizontalScroller, Section, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import { SectionCarousel } from "./SectionCarousel";
import { MediaImage } from "../../media/MediaImage";
import type { CustomCardsCard, CustomCardsSectionConfig } from "../schemas";

// --- Constants ---------------------------------------------------------------

const CLS_CONTAINER = "w-full max-w-7xl mx-auto px-4";

// --- Helpers -----------------------------------------------------------------

const COLS_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const RADIUS_CLASS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const SHADOW_CLASS: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

const VARIANT_CLASS: Record<string, string> = {
  primary:
    "inline-flex items-center justify-center px-4 py-2 rounded-md bg-[var(--appkit-color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity",
  secondary:
    "inline-flex items-center justify-center px-4 py-2 rounded-md bg-[var(--appkit-color-secondary)] text-white text-sm font-medium hover:opacity-90 transition-opacity",
  outline:
    "inline-flex items-center justify-center px-4 py-2 rounded-md border border-current text-sm font-medium hover:bg-black/5 transition-colors",
  ghost:
    "inline-flex items-center justify-center px-4 py-2 text-sm font-medium hover:underline transition-colors",
};

// --- Card Item ---------------------------------------------------------------

function CardItem({ card }: { card: CustomCardsCard }) {
  const radiusClass = RADIUS_CLASS[card.borderRadius ?? "lg"] ?? "rounded-lg";
  const shadowClass = SHADOW_CLASS[card.shadowLevel ?? "sm"] ?? "shadow-sm";

  const cardStyle: React.CSSProperties = {};
  if (card.backgroundColor) cardStyle.backgroundColor = card.backgroundColor;
  if (card.textColor) cardStyle.color = card.textColor;

  return (
    <div
      className={`flex flex-col overflow-hidden ${radiusClass} ${shadowClass} bg-[var(--appkit-color-surface)]`}
      style={cardStyle}
    >
      {card.image && (
        <div className="relative w-full aspect-video overflow-hidden">
          <MediaImage
            src={card.image}
            alt={card.imageAlt ?? ""}
            size="card"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 p-4 flex-1">
        {card.eyebrow && (
          <Text className="text-xs font-semibold uppercase tracking-widest opacity-70">
            {card.eyebrow}
          </Text>
        )}
        {card.title && (
          <Text className="text-base font-bold leading-snug">{card.title}</Text>
        )}
        {card.body && (
          <Text className="text-sm opacity-80 leading-relaxed flex-1">{card.body}</Text>
        )}

        {card.buttons && card.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {card.buttons.map((btn, i) => (
              <a
                key={i}
                href={btn.href}
                target={btn.target ?? "_self"}
                rel={btn.target === "_blank" ? "noopener noreferrer" : undefined}
                className={VARIANT_CLASS[btn.variant] ?? VARIANT_CLASS.primary}
              >
                {btn.label}
              </a>
            ))}
          </div>
        )}

        {card.formEmbed && (
          <iframe
            src={card.formEmbed}
            sandbox="allow-forms allow-scripts"
            loading="lazy"
            className="w-full mt-3 border-0 rounded-md"
            style={{ minHeight: "200px" }}
            title="Embedded form"
          />
        )}
      </div>
    </div>
  );
}

// --- Section Header ----------------------------------------------------------

function SectionHeader({ title }: { title?: string }) {
  const { themed } = THEME_CONSTANTS;
  if (!title) return null;
  return (
    <div className="mb-6">
      <Heading level={2} className={themed.textPrimary}>
        {title}
      </Heading>
    </div>
  );
}

// --- Main Component ----------------------------------------------------------

export type CustomCardsSectionProps = CustomCardsSectionConfig;

export function CustomCardsSection(config: CustomCardsSectionProps) {
  const { title, layout, columns = 3, cards, autoScroll, scrollIntervalMs } = config;
  const { themed } = THEME_CONSTANTS;

  if (!cards?.length) return null;

  // autoScroll: wrap all cards in SectionCarousel (client carousel)
  if (autoScroll) {
    return (
      <Section className={`py-12 ${themed.bgPrimary}`}>
        <div className={CLS_CONTAINER}>
          <SectionCarousel
            title={title ?? ""}
            items={cards}
            renderItem={(card) => <CardItem card={card} />}
            keyExtractor={(card) => card.id}
            autoScroll
            autoScrollInterval={scrollIntervalMs ?? 3500}
            perView={{ base: 1, sm: 2, md: columns as 1 | 2 | 3 | 4 }}
          />
        </div>
      </Section>
    );
  }

  // Row layout: horizontal scroller
  if (layout === "row") {
    return (
      <Section className={`py-12 ${themed.bgPrimary}`}>
        <div className={CLS_CONTAINER}>
          <SectionHeader title={title} />
          <HorizontalScroller gap={16} showArrows snapToItems loop>
            {cards.map((card) => (
              <div key={card.id} className="w-72 flex-shrink-0">
                <CardItem card={card} />
              </div>
            ))}
          </HorizontalScroller>
        </div>
      </Section>
    );
  }

  // Masonry layout: CSS columns
  if (layout === "masonry") {
    const colsClass = COLS_CLASS[columns as 1 | 2 | 3 | 4] ?? COLS_CLASS[3];
    const masonryClass = colsClass
      .split(" ")
      .map((c) => c.replace("grid-cols-", "columns-"))
      .join(" ");
    return (
      <Section className={`py-12 ${themed.bgPrimary}`}>
        <div className={CLS_CONTAINER}>
          <SectionHeader title={title} />
          <div className={`${masonryClass} gap-4 space-y-4`}>
            {cards.map((card) => (
              <div key={card.id} className="break-inside-avoid">
                <CardItem card={card} />
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  }

  // Grid layout (default)
  const colsClass = COLS_CLASS[columns as 1 | 2 | 3 | 4] ?? COLS_CLASS[3];
  return (
    <Section className={`py-12 ${themed.bgPrimary}`}>
      <div className={CLS_CONTAINER}>
        <SectionHeader title={title} />
        <div className={`grid ${colsClass} gap-4`}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </div>
    </Section>
  );
}
