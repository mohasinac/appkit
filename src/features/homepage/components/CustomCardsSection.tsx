"use client";
import Link from "next/link";
import React from "react";
import {
  Div,
  Heading,
  HorizontalScroller,
  PlainCard,
  PLAIN_CLASS,
  PosterCard,
  PosterGrid,
  POSTER_CLASS,
  Section,
  Anchor,
} from "../../../ui";
import { THEMED_TEXT_PRIMARY } from "../../../_internal/shared/styles/themed";
/* Not re-exported from `ui/index` — import from the defining module (Root Cause #18). */
import { Iframe } from "../../../ui/components/Iframe";
import { SectionCarousel } from "./SectionCarousel";
import { MediaImage } from "../../media/MediaImage";
import type { CustomCardsCard, CustomCardsSectionConfig } from "../schemas";

// --- Constants ---------------------------------------------------------------

const CLS_CONTAINER = "w-full max-w-7xl mx-auto px-[var(--appkit-space-4)]";

/**
 * Which of the four authored button variants reads as a DESTINATION rather
 * than a sibling.
 *
 * The four generic variants (`primary`/`secondary`/`outline`/`ghost`) were
 * four different button shapes in one wrapping row — the single biggest
 * reason the systems matrix read as a pile of controls rather than a set of
 * links. Collapsed to two levels of emphasis: a chip is either one of many
 * peers, or it is the card's main destination.
 */
type CardButton = NonNullable<CustomCardsCard["buttons"]>[number];

function isKeyChip(variant: CardButton["variant"]): boolean {
  return variant !== "ghost";
}

/**
 * 🛑 `next/link` for an internal href, a plain `<a>` only for an external one.
 *
 * A bare anchor on an internal route does a FULL PAGE LOAD — the regression
 * documented on `OverflowRow.linkAs`, and invisible apart from the flash. The
 * hrefs here are admin-authored, so both kinds genuinely occur.
 */
function Chip({
  button,
  className,
}: {
  button: CardButton;
  className: string;
}) {
  const external = button.target === "_blank" || /^https?:\/\//.test(button.href);

  if (external) {
    /*
     * 🛑 `<Anchor>`, not a raw `<a>`. It owns the target+rel pair, so an external
     * link cannot ship `target="_blank"` without `rel="noopener noreferrer"` —
     * that is a tabnabbing hole, not a style preference. This branch had both
     * written out by hand and correct; the point is that the next one will not be.
     */
    return (
      <Anchor href={button.href} className={className} external target={button.target ?? "_blank"}>
        {button.label}
      </Anchor>
    );
  }

  return (
    <Link href={button.href} className={className}>
      {button.label}
    </Link>
  );
}

/**
 * Peers first, destinations last.
 *
 * The seeded order interleaves them ("… Heavy Metal System, Parts, Launchers"
 * on one card, "Parts" mid-row on another), so the solid chips landed in a
 * different place on every card and the row had no readable shape. Sorting is
 * stable, so the authored order within each group is preserved.
 */
function orderedButtons(buttons: readonly CardButton[]): CardButton[] {
  return [...buttons].sort(
    (a, b) => Number(isKeyChip(a.variant)) - Number(isKeyChip(b.variant)),
  );
}

// --- Card Item ---------------------------------------------------------------

function CardItem({ card }: { card: CustomCardsCard }) {
  const buttons = card.buttons?.length ? orderedButtons(card.buttons) : [];

  /*
   * With artwork → the poster treatment: the image fills the card and the
   * scrim carries the type. Without → the plain card. Branching on the data
   * rather than on a config flag keeps every OTHER `custom-cards` section an
   * admin has authored rendering exactly as before.
   */
  if (card.image) {
    return (
      <PosterCard
        height="tall"
        media={
          <MediaImage
            src={card.image}
            alt={card.imageAlt ?? ""}
            size="card"
            objectFit="cover"
          />
        }
        eyebrow={card.eyebrow}
        title={card.title}
        text={card.body}
        chips={
          buttons.length > 0
            ? buttons.map((btn, i) => (
                <Chip
                  key={`${btn.href}-${i}`}
                  button={btn}
                  className={
                    isKeyChip(btn.variant)
                      ? `${POSTER_CLASS.chip} ${POSTER_CLASS.chipKey}`
                      : POSTER_CLASS.chip
                  }
                />
              ))
            : undefined
        }
      />
    );
  }

  return (
    <PlainCard
      eyebrow={card.eyebrow}
      title={card.title}
      text={card.body}
      chips={
        buttons.length > 0
          ? buttons.map((btn, i) => (
              <Chip
                key={`${btn.href}-${i}`}
                button={btn}
                className={
                  isKeyChip(btn.variant)
                    ? `${PLAIN_CLASS.chip} ${PLAIN_CLASS.chipKey}`
                    : PLAIN_CLASS.chip
                }
              />
            ))
          : undefined
      }
      footer={
        card.formEmbed ? (
          <Iframe
            src={card.formEmbed}
            title="Embedded form"
            sandbox="allow-forms allow-scripts"
          />
        ) : undefined
      }
    />
  );
}

// --- Section Header ----------------------------------------------------------

function SectionHeader({ title }: { title?: string }) {
  const themed = { textPrimary: THEMED_TEXT_PRIMARY };
  if (!title) return null;
  return (
    <Div className="mb-6 text-left">
      <Heading
        level={2}
        className={themed.textPrimary}
        size="2xl"
        mdSize="3xl"
        weight="bold"
      >
        {title}
      </Heading>
    </Div>
  );
}

// --- Main Component ----------------------------------------------------------

export type CustomCardsSectionProps = CustomCardsSectionConfig;

export function CustomCardsSection(config: CustomCardsSectionProps) {
  const {
    title,
    layout,
    columns = 3,
    cards,
    autoScroll,
    scrollIntervalMs,
    loop = true,
  } = config;
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
            loop={loop}
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
          <HorizontalScroller
            gap={16}
            showArrows
            snapToItems
            loop={loop}
            items={cards}
            keyExtractor={(card) => card.id}
            renderItem={(card) => (
              <Div className="w-72 flex-shrink-0">
                <CardItem card={card} />
              </Div>
            )}
          />
        </Div>
      </Section>
    );
  }

  /*
   * Masonry. `columns-*` on a container whose children are poster cards would
   * fragment them across column boundaries, so the cards still carry
   * `break-inside-avoid` — unchanged behaviour, just the new card shapes.
   */
  if (layout === "masonry") {
    const masonryClass =
      columns === 4
        ? "columns-1 sm:columns-2 lg:columns-4"
        : columns === 2
          ? "columns-1 sm:columns-2"
          : columns === 1
            ? "columns-1"
            : "columns-1 sm:columns-2 lg:columns-3";
    return (
      <Section padding="y-3xl" surface="muted">
        <Div className={CLS_CONTAINER}>
          <SectionHeader title={title} />
          {/*
            `gap-4`/`mb-4`, not `gap-[var(--appkit-space-4)]`. The token is
            1rem, which is exactly what those utilities emit — and an
            arbitrary-value utility authored inside appkit is one its own
            Tailwind build may not generate, in which case the class silently
            compiles to nothing (`audit-dead-css-classes` caught precisely
            that on the `mb-` one).
          */}
          <Div gap="4" className={masonryClass}>
            {cards.map((card) => (
              <Div key={card.id} className="break-inside-avoid mb-4">
                <CardItem card={card} />
              </Div>
            ))}
          </Div>
        </Div>
      </Section>
    );
  }

  // Grid layout (default)
  return (
    <Section padding="y-3xl" surface="muted">
      <Div className={CLS_CONTAINER}>
        <SectionHeader title={title} />
        <PosterGrid columns={columns}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </PosterGrid>
      </Div>
    </Section>
  );
}
