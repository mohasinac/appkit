import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Span, Text } from "../../../ui/components/Typography";
import { DynamicBgDiv } from "../../../ui/components/DynamicBgDiv";
import { MediaImage } from "../../media/MediaImage";
import { ImageMosaic, MOSAIC_MIN } from "../../../ui/components/ImageMosaic";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

import type { CategoryItem } from "../types";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_FEATURED_DOT = "absolute left-2 top-2 rounded-full bg-warning-surface p-[var(--appkit-space-1)] leading-none";

// --- CategoryCard -------------------------------------------------------------

export interface CategoryCardProps {
  category: CategoryItem;
  href?: string;
  onClick?: (category: CategoryItem) => void;
  className?: string;
  /**
   * Owner-only pencil / clone / bin, for an admin (categories have no owner,
   * so only an admin ever sees it). Pass `<OwnerQuickActions>`.
   *
   * 🛑 Rendered OUTSIDE this card's `<Link>`, as a sibling. A `<button>`
   * inside an `<a>` is invalid HTML that browsers resolve by closing the
   * anchor early, which breaks the CARD's navigation rather than just the
   * button's.
   */
  renderOwnerActions?: () => React.ReactNode;
}

export function CategoryCard({
  category,
  href,
  onClick,
  className = "",
  renderOwnerActions,
}: CategoryCardProps) {
  // totalProductCount is the rollup (self + all descendant categories),
  // maintained incrementally by onProductWrite — prefer it over the
  // own-node-only productCount so a parent category's card shows the same
  // "N products" a visitor actually sees once they open the page.
  const productCount =
    category.metrics?.totalProductCount ?? category.metrics?.productCount ?? (category as any).productCount ?? 0;

  /*
   * Is a real picture going to render in the image area? Drives the emoji
   * overlay below, which must not paint over artwork. Deliberately mirrors the
   * first two branches of the chain rather than being derived from it — the
   * `color` branch is a flat tint, which an emoji on top of is still the
   * intended look.
   */
  const hasArtwork =
    (category.display?.mosaicImages?.length ?? 0) >= MOSAIC_MIN ||
    Boolean(category.display?.coverImage);

  const inner = (
    <Stack className="h-full">
      {/* Image area — fixed aspect ratio */}
      <Div surface="muted" className={`relative aspect-[4/3] w-full ${__O.hidden} flex-shrink-0`}>
        {/*
          * A BUNDLE is its contents, so its card shows a collage of its members
          * rather than one tile. Checked BEFORE `coverImage` on purpose: every
          * bundle also carries a generic placeholder cover, so testing the
          * cover first would mean the collage never rendered.
          *
          * `<ImageMosaic>` returns null below MOSAIC_MIN (3), so a bundle with
          * too few resolvable members falls through to the cover automatically —
          * the `??` chain below is the fallback, not a separate branch.
          */}
        {(category.display?.mosaicImages?.length ?? 0) >= MOSAIC_MIN ? (
          <ImageMosaic
            images={category.display!.mosaicImages!}
            alt={category.name}
            className="h-full w-full"
          />
        ) : category.display?.coverImage ? (
          <MediaImage
            src={category.display.coverImage}
            alt={category.name}
            size="card"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        ) : category.display?.color ? (
          <DynamicBgDiv color={category.display.color} className="h-full w-full opacity-80" />
        ) : null}
        {/*
          * Icon overlay — a FALLBACK, not a decoration on top of artwork.
          *
          * 🛑 It used to render unconditionally, `absolute inset-0` at 4xl, so
          * a row carrying both a cover and an emoji got a giant glyph centred
          * over its photograph. That was invisible while the twelve forest
          * roots all carried placeholder tiles and nothing else; the moment a
          * real cover landed on one it became the most obvious thing on the
          * card. Same reading as `brand-rows.ts` trap 2 and
          * `resolveTaxonomyVisual`: an emoji is what you show when you have no
          * image, never what you show over one.
          */}
        {category.display?.icon && !hasArtwork && (
          <Row textSize="4xl" className="absolute inset-0" align="center" justify="center">
            {category.display.icon}
          </Row>
        )}
        {/* Featured badge */}
        {category.isFeatured && (
          <Span size="xs" className={CLS_FEATURED_DOT}>
            ★
          </Span>
        )}
      </Div>

      {/* Content */}
      <Stack className={`flex-1 ${__P.p3}.5`}>
        <Text color="inverse" className={`leading-snug text-[var(--appkit-color-text)] dark:`} truncate={2} size="sm" weight="semibold">
          {category.name}
        </Text>
        {category.description && (
          <Text className={`mt-1 flex-1`} color="muted" truncate={2} size="xs">
            {category.description}
          </Text>
        )}
        <Row className="mt-2" align="center" justify="between" gap="sm">
          <Text size="xs" color="faint">
            {productCount.toLocaleString()} {productCount === 1 ? "item" : "items"}
          </Text>
          <Span layout="inline-flex" gap="xs" size="xs" weight="medium" border="default" className="group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-colors" rounded="md" padding="pill-sm-tall" color="muted">
            Browse <ArrowRight className="h-3 w-3" />
          </Span>
        </Row>
      </Stack>
    </Stack>
  );

  const cardClass = `group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-[var(--appkit-color-surface)] border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] shadow-sm transition hover:shadow-md h-full ${className}`;

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  const card = (
    <Div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(category)
          : undefined
      }
      onClick={onClick ? () => onClick(category) : undefined}
      className={cardClass}
    >
      {inner}
    </Div>
  );

  /*
   * 🛑 The quick actions are the DEFAULT, not an opt-in.
   *
   * This was `if (!renderOwnerActions) return card;` and NOTHING in either
   * repo ever passed `renderOwnerActions` — measured across all nine card
   * components that declare it. So the pencil was unreachable on every grid in
   * the app, and the slot read as wired because the prop, the docstring and
   * the positioning were all present. Root Cause #8's shape: a slot shell
   * rendered with zero render props.
   *
   * A card is resource-specific by construction — a CategoryCard is always a
   * category — so it can name its own resource and needs no threading through
   * the dozens of listing views that mount it. `RecordOwnerQuickActions` is a
   * Client Component receiving only strings, which is the ordinary RSC
   * boundary; the thing that cannot cross it is a FUNCTION prop, which is why
   * the detail views could not pass `onDelete` directly.
   *
   * The override seam stays for a caller that genuinely needs different
   * actions.
   */
  const ownerActions = renderOwnerActions ? (
    renderOwnerActions()
  ) : category.id ? (
    <RecordOwnerQuickActions
      resource="CATEGORY"
      recordId={String(category.id)}
      recordLabel={category.name}
      placement="card"
    />
  ) : null;

  if (!ownerActions) return card;
  /*
   * Sibling of the card, never a child — see the prop's docstring. `z-20`
   * beats the featured dot at `left-2 top-2`.
   */
  return (
    <Div className="relative h-full">
      {card}
      <Div className="absolute right-2 top-2 z-20">{ownerActions}</Div>
    </Div>
  );
}

// --- CategoryGrid -------------------------------------------------------------

export interface CategoryGridProps {
  categories: CategoryItem[];
  getHref?: (category: CategoryItem) => string;
  onCategoryClick?: (category: CategoryItem) => void;
  emptyLabel?: string;
  className?: string;
}

export function CategoryGrid({
  categories,
  getHref,
  onCategoryClick,
  emptyLabel = "No categories found",
  className = "",
}: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <Text paddingY="3xl" className="text-[var(--appkit-color-text-muted)]" size="sm" align="start">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Grid cols="categoryCards" gap="md" className={className}>
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          href={getHref ? getHref(cat) : undefined}
          onClick={!getHref ? onCategoryClick : undefined}
        />
      ))}
    </Grid>
  );
}
