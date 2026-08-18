"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { THEMED_TEXT_PRIMARY } from "../../../_internal/shared/styles/themed";
import { Button, Div, Heading, HorizontalScroller, Row, Section, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import { useTopBrands } from "../hooks/useTopBrands";
import type { CategoryItem } from "../../categories/types";
import type { SectionCTA } from "../schemas/firestore";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CTA_CLASSES: Record<SectionCTA["variant"], string> = {
  filled: "rounded-lg bg-[var(--appkit-color-primary)] px-[var(--appkit-space-5)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-semibold text-white hover:opacity-90",
  outline: "rounded-lg border border-[var(--appkit-color-primary)] px-[var(--appkit-space-5)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-semibold text-[var(--appkit-color-primary)] hover:bg-[var(--appkit-color-primary)]/10",
  text: "text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-primary)] hover:underline",
};

function BrandFilterChip({
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

export interface BrandsSectionProps {
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
    byCountry?: string;
  };
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

function BrandLogo({ brand }: { brand: CategoryItem }) {
  const iconSrc = brand.display?.icon;
  const coverImage = brand.display?.coverImage;
  const initial = brand.name[0]?.toUpperCase() ?? "?";
  return (
    <Link
      href={ROUTES.PUBLIC.CATEGORY_DETAIL(brand.slug)}
      className="flex h-32 w-36 flex-col items-center justify-center gap-[var(--appkit-space-2)] rounded-xl border border-zinc-200 bg-[var(--appkit-color-surface)] p-[var(--appkit-space-3)] shadow-sm transition-all hover:border-primary-300 hover:shadow-md border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] md:h-40"
    >
      {iconSrc || coverImage ? (
        <Image
          src={iconSrc ?? coverImage!}
          alt={brand.name}
          width={64}
          height={64}
          className="h-16 w-16 rounded object-contain"
        />
      ) : (
        <Row textWeight="bold" textSize="sm" className="h-16 w-16 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300" align="center" justify="center" rounded="lg">
          {initial}
        </Row>
      )}
      <Text className="w-full truncate" color="muted" size="xs" weight="medium" align="start">
        {brand.name}
      </Text>
    </Link>
  );
}

export function BrandsSection({
  title = "Top Brands",
  subtitle,
  limit = 12,
  viewMoreHref,
  viewMoreLabel = "All brands →",
  className = "",
  initialItems,
  cta,
  filters,
  autoScroll = true,
  scrollInterval = 4000,
  loop = true,
}: BrandsSectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY };
const { data: allBrands = [], isLoading } = useTopBrands(limit, { initialData: initialItems });
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Available filter chips: "All" + "Featured" when featuredOnly filter is configured
  const showFeaturedChip = filters?.featuredOnly !== undefined;

  const brands = allBrands.filter((brand) => {
    if (activeFilter === "featured" && !brand.isFeatured) return false;
    return true;
  });

  if (!isLoading && allBrands.length === 0) return null;

  return (
    <Section className={`${className}`} surface="subtle" paddingY="y-3xl" paddingX="x-md">
      <Div className="mx-auto max-w-7xl">
        <Row className="mb-6" align="center" justify="between">
          <>
            <Heading level={2} className={themed.textPrimary} size="2xl" mdSize="3xl" weight="bold">
              {title}
            </Heading>
            {subtitle && (
              <Text variant="secondary" className="mt-1" size="sm">
                {subtitle}
              </Text>
            )}
          </>
          {!cta && viewMoreHref && (
            <Link href={viewMoreHref} className="text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-primary)] hover:underline">
              {viewMoreLabel}
            </Link>
          )}
        </Row>

        {/* Filter chips */}
        {showFeaturedChip && !isLoading && (
          <Row wrap gap="sm" className="mb-4">
            <BrandFilterChip label="All" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            <BrandFilterChip label="Featured" active={activeFilter === "featured"} onClick={() => setActiveFilter(activeFilter === "featured" ? "all" : "featured")} />
          </Row>
        )}

        {isLoading ? (
          <Div layout="flex" gap="3" className={`${__O.hidden}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Div key={i} className="h-32 w-36 flex-none animate-pulse md:h-40" surface="subtle" rounded="xl" />
            ))}
          </Div>
        ) : (
          <HorizontalScroller
            items={brands}
            renderItem={(brand: CategoryItem) => <BrandLogo brand={brand} />}
            keyExtractor={(brand) => brand.id}
            gap={12}
            showArrows
            showScrollbar={false}
            autoScroll={autoScroll}
            autoScrollInterval={scrollInterval}
            pauseOnHover
            loop={loop}
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
      </Div>
    </Section>
  );
}
