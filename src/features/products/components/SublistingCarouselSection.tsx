"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "../../../next";
import { Div, Row, Span, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeListingType } from "../utils/listing-type";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import type { ListingType } from "../types";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

interface CarouselListing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  mainImage?: string;
  slug?: string;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
}

interface CategoryMeta {
  name: string;
  slug: string;
  productCount: number;
}

interface ApiResponse {
  data?: {
    category?: CategoryMeta;
    listings?: CarouselListing[];
  };
}

interface Props {
  sublistingCategoryId: string;
  currentListingId: string;
}

function getHref(listing: CarouselListing): string {
  const slug = listing.slug ?? listing.id;
  return pluginFor(normalizeListingType(listing)).detailRoute(slug);
}

function ListingThumb({
  listing,
  isCurrent,
}: {
  listing: CarouselListing;
  isCurrent: boolean;
}) {
  const image = listing.images?.[0] ?? listing.mainImage ?? "";
  const href = getHref(listing);
  const price = formatCurrency(listing.price, listing.currency ?? "INR");

  return (
    <Link
      href={href}
      aria-label={listing.title}
      className="flex flex-col items-center gap-[var(--appkit-space-1-5)] flex-shrink-0 w-16 group"
    >
      <Div
        rounded="full"
        className={`relative w-14 h-14 overflow-hidden border-2 transition-all ${
 isCurrent
 ? "border-[var(--appkit-color-primary)] ring-2 ring-[var(--appkit-color-primary)]/30"
 : "border-[var(--appkit-color-border)] group-hover:border-[var(--appkit-color-primary)]"
 }`}
      >
        {image ? (
          <MediaImage src={image} alt={listing.title} size="avatar" />
        ) : (
          <Row textSize="xs" color="faint" className="w-full h-full" surface="subtle" align="center" justify="center">
            â—¯
          </Row>
        )}
      </Div>
      <Text className="text-[10px] leading-tight line-clamp-2 w-full" color="muted" align="center">
        {listing.title}
      </Text>
      <Text className="text-[10px]" color="primary" weight="semibold">
        {price}
      </Text>
    </Link>
  );
}

export function SublistingCarouselSection({ sublistingCategoryId, currentListingId }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryMeta | null>(null);
  const [listings, setListings] = useState<CarouselListing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sublistingCategoryId) return;
    setLoading(true);
    fetch(`/api/sublisting-categories/${encodeURIComponent(sublistingCategoryId)}`)
      .then((r) => r.json())
      .then((res: ApiResponse) => {
        setCategory(res.data?.category ?? null);
        setListings(res.data?.listings ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sublistingCategoryId]);

  if (!sublistingCategoryId || loading || (!category && !loading)) return null;
  if (listings.length <= 1) return null;

  const others = listings.filter((l) => l.id !== currentListingId);
  if (others.length === 0) return null;

  const label = category?.name ?? "More listings like this";

  return (
    <Div className={`${__O.hidden}`} surface="muted" rounded="xl" border="default">
      <Row
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        justify="between"
        paddingX="x-md"
        paddingY="y-sm"
        className="w-full cursor-pointer text-left hover:bg-[var(--appkit-color-surface-elevated)]/70 transition-colors"
        aria-expanded={open}
      >
        <Row align="center" gap="xs">
          <Span size="xs" className="mr-1" color="faint">
            {open ? "â–¼" : "â–¶"}
          </Span>
          <Text size="sm" weight="medium" color="primary">
            More listings like this:{" "}
            <Span className="text-[var(--appkit-color-primary)]">{label}</Span>
          </Text>
          <Span size="xs" className="ml-1" rounded="full" padding="pill-xs" surface="subtle" color="muted">
            {listings.length}
          </Span>
        </Row>
        {category && (
          <Link
            href={String(ROUTES.PUBLIC.SUBLISTING_CATEGORY(category.slug))}
            onClick={(e) => e.stopPropagation()}
            className="text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-primary)] hover:underline ml-3 flex-shrink-0"
          >
            View all â†’
          </Link>
        )}
      </Row>

      {open && (
        <Div className={`pb-[1rem] pt-[0.25rem] ${__O.xAuto}`} padding="x-md">
          <Row gap="3" className="min-w-0">
            {listings.map((listing) => (
              <ListingThumb
                key={listing.id}
                listing={listing}
                isCurrent={listing.id === currentListingId}
              />
            ))}
          </Row>
        </Div>
      )}
    </Div>
  );
}
