"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "../../../next";
import { Row, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { isAuctionListing, isPreOrderListing } from "../utils/listing-type";

interface CarouselListing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  mainImage?: string;
  slug?: string;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live";
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
  if (isAuctionListing(listing)) return String(ROUTES.PUBLIC.AUCTION_DETAIL(slug));
  if (isPreOrderListing(listing)) return String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(slug));
  return String(ROUTES.PUBLIC.PRODUCT_DETAIL(slug));
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
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 group"
    >
      <div
        className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
          isCurrent
            ? "border-[var(--appkit-color-primary,#6366f1)] ring-2 ring-[var(--appkit-color-primary,#6366f1)]/30"
            : "border-zinc-200 dark:border-zinc-700 group-hover:border-[var(--appkit-color-primary,#6366f1)]"
        }`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
            â—¯
          </div>
        )}
      </div>
      <Text className="text-[10px] text-center text-zinc-600 dark:text-zinc-400 leading-tight line-clamp-2 w-full">
        {listing.title}
      </Text>
      <Text className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sublistingCategoryId]);

  if (!sublistingCategoryId || loading || (!category && !loading)) return null;
  if (listings.length <= 1) return null;

  const others = listings.filter((l) => l.id !== currentListingId);
  if (others.length === 0) return null;

  const label = category?.name ?? "More listings like this";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 transition-colors"
        aria-expanded={open}
      >
        <Row align="center" gap="xs">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">
            {open ? "â–¼" : "â–¶"}
          </span>
          <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            More listings like this:{" "}
            <span className="text-[var(--appkit-color-primary,#6366f1)]">{label}</span>
          </Text>
          <span className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {listings.length}
          </span>
        </Row>
        {category && (
          <Link
            href={String(ROUTES.PUBLIC.SUBLISTING_CATEGORY(category.slug))}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[var(--appkit-color-primary,#6366f1)] hover:underline ml-3 flex-shrink-0"
          >
            View all â†’
          </Link>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 overflow-x-auto">
          <div className="flex gap-3 min-w-0">
            {listings.map((listing) => (
              <ListingThumb
                key={listing.id}
                listing={listing}
                isCurrent={listing.id === currentListingId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
