"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { THEMED_TEXT_PRIMARY } from "../../../_internal/shared/styles/themed";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { HorizontalScroller } from "../../../ui/components/HorizontalScroller";
import { POSTER_CLASS } from "../../../ui/components/PosterCard";
import { Row } from "../../../ui/components/Layout";
import { Section } from "../../../ui/components/Semantic";
import { ROUTES } from "../../../next/routing/route-map";
import { resolveMediaUrl } from "../../../utils/media-url";
import { useTopCategories } from "../hooks/useTopCategories";
import type { CategoryItem } from "../../categories/types";
import type { SectionCTA } from "../schemas/firestore";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";

export interface ShopByCategorySectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  initialItems?: CategoryItem[];
  cta?: SectionCTA;
  filters?: {
    featuredOnly?: boolean;
    rootOnly?: boolean;
    rootCategoryId?: string;
  };
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

function isImageUrl(s: string): boolean {
  return s.startsWith("http") || s.startsWith("/") || s.startsWith("data:");
}

/**
 * One category tile.
 *
 * 🛑 Image-LED, not image-on-top-of-a-body. The previous shape was a 16:9 crop
 * stacked over a white block holding an icon square, the name, a count and a
 * "Browse category →" line — four separate type sizes and a redundant CTA on a
 * tile that is already entirely a link. It also letterboxed the artwork: every
 * generation cover is portrait key art, so `aspect-video` cropped it to a
 * horizontal band through the middle.
 *
 * Now it is the same `PosterCard` the systems matrix uses, so the two bands on
 * the homepage read as one system rather than two designs.
 */
function CategoryChip({ category }: { category: CategoryItem }) {
  const iconSrc = category.display?.icon;
  const coverImage = category.display?.coverImage;
  const resolvedCover = coverImage && isImageUrl(coverImage) ? resolveMediaUrl(coverImage) : undefined;
  const productCount = category.metrics?.totalProductCount ?? category.metrics?.productCount ?? 0;

  /*
   * `display.icon` holds an EMOJI in the seed and a URL in other writers —
   * the ambiguity `resolveTaxonomyVisual` exists for. Only the emoji form is
   * used as an eyebrow glyph here; a URL would print as raw text.
   */
  const emoji = iconSrc && !isImageUrl(iconSrc) ? iconSrc : undefined;

  return (
    <Link
      href={ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug)}
      className={`${POSTER_CLASS.root} ${POSTER_CLASS.compact} w-full`}
    >
      {resolvedCover ? (
        <Div className={POSTER_CLASS.media}>
          {/*
            `fill` + `sizes`, not a fixed 320×180. The tile is a flex child of a
            horizontal scroller whose width varies by breakpoint, so a declared
            intrinsic size made Next serve the wrong candidate at every width
            except one.
          */}
          <Image
            src={resolvedCover}
            alt=""
            fill
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 80vw"
            className="h-full w-full object-cover"
          />
        </Div>
      ) : null}
      <Div className={POSTER_CLASS.scrim} aria-hidden="true" />

      <Div className={POSTER_CLASS.body}>
        {emoji && (
          <Span className={POSTER_CLASS.eyebrow} aria-hidden="true">
            {emoji}
          </Span>
        )}
        <Span className={POSTER_CLASS.title}>{category.name}</Span>
        <Span className={POSTER_CLASS.meta}>
          {productCount.toLocaleString()} items
        </Span>
      </Div>
    </Link>
  );
}

const CTA_CLASSES: Record<SectionCTA["variant"], string> = {
  filled: "rounded-lg bg-[var(--appkit-color-primary)] px-[var(--appkit-space-5)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-semibold text-white hover:opacity-90",
  outline: "rounded-lg border border-[var(--appkit-color-primary)] px-[var(--appkit-space-5)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-semibold text-[var(--appkit-color-primary)] hover:bg-[var(--appkit-color-primary)]/10",
  text: "text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-primary)] hover:underline",
};

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={onClick}
      rounded="full"
      paddingX="sm"
      paddingY="xs"
      textSize="xs"
      weight="medium"
      className={[
        "whitespace-nowrap transition-colors",
        active
          ? "border-[var(--appkit-color-primary)] bg-[var(--appkit-color-primary)] text-white"
          : "border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text-muted)] hover:border-[var(--appkit-color-primary)]",
      ].join(" ")}
    >
      {label}
    </Button>
  );
}

export function ShopByCategorySection({
  title = "Shop by Category",
  subtitle,
  limit = 12,
  viewMoreHref,
  viewMoreLabel = "View all categories →",
  className = "",
  initialItems,
  cta,
  filters,
  autoScroll = true,
  scrollInterval = 3500,
  loop = true,
}: ShopByCategorySectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY };
const { data: allCategories = [], isLoading } = useTopCategories(limit, { initialData: initialItems });
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Build client-side filter chip options from root-level parent IDs
  const rootIds = filters?.rootCategoryId
    ? [filters.rootCategoryId]
    : Array.from(new Set(allCategories.flatMap((c) => c.parentIds ?? [c.id]).filter(Boolean)));

  const hasFilters = !!(
    filters?.featuredOnly !== undefined ||
    filters?.rootCategoryId ||
    rootIds.length > 1
  );

  const filtered = allCategories.filter((cat) => {
    if (activeFilter !== "all") {
      const inParents = cat.parentIds?.includes(activeFilter) ?? false;
      if (!inParents && cat.id !== activeFilter) return false;
    }
    if (filters?.featuredOnly && !cat.isFeatured) return false;
    if (filters?.rootOnly && (cat.parentIds?.length ?? 0) > 0) return false;
    return true;
  });

  const categories = filtered.length > 0 ? filtered : allCategories;

  if (!isLoading && allCategories.length === 0) return null;

  return (
    <Section className={`md:py-[3rem] ${className}`} surface="subtle" paddingY="y-2xl" paddingX="x-md">
      <Div className="mx-auto max-w-7xl">
        <Div className="mb-6 text-left">
          <Heading level={2} className={themed.textPrimary} size="2xl" mdSize="3xl" weight="bold">
            {title}
          </Heading>
          {subtitle && (
            <Text variant="secondary" className="mt-1" size="sm">
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Filter chips */}
        {hasFilters && !isLoading && (
          <Row wrap gap="sm" className="mb-4">
            <FilterChip label="All" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            {rootIds.slice(0, 5).map((id) => {
              const cat = allCategories.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <FilterChip
                  key={id}
                  label={cat.name}
                  active={activeFilter === id}
                  onClick={() => setActiveFilter(activeFilter === id ? "all" : id)}
                />
              );
            })}
          </Row>
        )}

        {isLoading ? (
          <Div layout="flex" gap="3" overflow="hidden" className="px-[0.25rem]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Div key={i} className="flex-none h-[104px] w-[108px] animate-pulse" surface="subtle" rounded="xl" />
            ))}
          </Div>
        ) : (
          <HorizontalScroller
            items={categories}
            renderItem={(cat) => <CategoryChip category={cat} />}
            perView={CAROUSEL_PER_VIEW.standard}
            gap={16}
            keyExtractor={(cat) => cat.id}
            autoScroll={autoScroll}
            autoScrollInterval={scrollInterval}
            showArrows
            snapToItems
            showScrollbar={false}
            loop={loop}
            pauseOnHover
          />
        )}

        {/* CTA button */}
        {cta && !isLoading && (
          <Div className="mt-6 text-left">
            <Link href={cta.href} className={CTA_CLASSES[cta.variant]}>
              {cta.label}
            </Link>
          </Div>
        )}

        {/* Fallback view-more link when no CTA configured */}
        {!cta && viewMoreHref && !isLoading && (
          <Div className="mt-6 text-left">
            {/*
              Solid fill, matching SectionCarousel — see the note in
              BrandsSection. This was a plain teal text link, one of the five
              section CTAs (of eleven) that lacked the fill the other six had.
            */}
            <Link
              href={viewMoreHref}
              className="inline-flex items-center gap-[0.375rem] rounded-[var(--appkit-radius-md)] px-[var(--appkit-space-3)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-sm)] font-semibold transition-colors bg-primary text-white hover:bg-primary-600"
            >
              {viewMoreLabel}
            </Link>
          </Div>
        )}
      </Div>
    </Section>
  );
}
