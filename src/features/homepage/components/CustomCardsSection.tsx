import React from "react";
import { Div, Heading, HorizontalScroller, Section, Stack, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import { SectionCarousel } from "./SectionCarousel";
import { MediaImage } from "../../media/MediaImage";
import type { CustomCardsCard, CustomCardsSectionConfig } from "../schemas";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

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
    <Stack
      className={`overflow-hidden ${radiusClass} ${shadowClass} bg-[var(--appkit-color-surface)]`}
      // audit-inline-style-ok: pass-through style prop
      style={cardStyle}
    >
      {card.image && (
        <Div className={`relative w-full aspect-video ${__O.hidden}`}>
          <MediaImage
            src={card.image}
            alt={card.imageAlt ?? ""}
            size="card"
          />
        </Div>
      )}

      <Stack className={`${__P.p4} flex-1`} gap="sm">
        {card.eyebrow && (
          <Text className="tracking-widest opacity-70" size="xs" weight="semibold" transform="uppercase">
            {card.eyebrow}
          </Text>
        )}
        {card.title && (
          <Text className="leading-snug" size="base" weight="bold">{card.title}</Text>
        )}
        {card.body && (
          <Text className="opacity-80 leading-relaxed flex-1" size="sm">{card.body}</Text>
        )}

        {card.buttons && card.buttons.length > 0 && (
          <Div className="flex flex-wrap gap-2 mt-2">
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
          </Div>
        )}

        {card.formEmbed && (
          <iframe
            src={card.formEmbed}
            sandbox="allow-forms allow-scripts"
            loading="lazy"
            className="w-full mt-3 border-0 rounded-md"
            // audit-inline-style-ok: dynamic CSS
            style={{ minHeight: "200px" }}
            title="Embedded form"
          />
        )}
      </Stack>
    </Stack>
  );
}

// --- Section Header ----------------------------------------------------------

function SectionHeader({ title }: { title?: string }) {
  const { themed } = THEME_CONSTANTS;
  if (!title) return null;
  return (
    <Div className="mb-6">
      <Heading level={2} className={themed.textPrimary}>
        {title}
      </Heading>
    </Div>
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
      <Section padding="y-3xl" surface="muted">
        <Div className={CLS_CONTAINER}>
          <SectionCarousel
            title={title ?? ""}
            items={cards}
            renderItem={(card) => <CardItem card={card} />}
            keyExtractor={(card) => card.id}
            autoScroll
            autoScrollInterval={scrollIntervalMs ?? 3500}
            perView={{ base: 1, sm: 2, md: columns as 1 | 2 | 3 | 4 }}
          />
        </Div>
      </Section>
    );
  }

  // Row layout: horizontal scroller
  if (layout === "row") {
    return (
      <Section padding="y-3xl" surface="muted">
        <Div className={CLS_CONTAINER}>
          <SectionHeader title={title} />
          <HorizontalScroller gap={16} showArrows snapToItems loop>
            {cards.map((card) => (
              <Div key={card.id} className="w-72 flex-shrink-0">
                <CardItem card={card} />
              </Div>
            ))}
          </HorizontalScroller>
        </Div>
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
      <Section padding="y-3xl" surface="muted">
        <Div className={CLS_CONTAINER}>
          <SectionHeader title={title} />
          <Stack className={`${masonryClass}`} gap="md">
            {cards.map((card) => (
              <Div key={card.id} className="break-inside-avoid">
                <CardItem card={card} />
              </Div>
            ))}
          </Stack>
        </Div>
      </Section>
    );
  }

  // Grid layout (default)
  const colsClass = COLS_CLASS[columns as 1 | 2 | 3 | 4] ?? COLS_CLASS[3];
  return (
    <Section padding="y-3xl" surface="muted">
      <Div className={CLS_CONTAINER}>
        <SectionHeader title={title} />
        <Div className={`grid ${colsClass} gap-4`}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </Div>
      </Div>
    </Section>
  );
}
