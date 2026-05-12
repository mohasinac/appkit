/**
 * Bundles Seed Data — Tier SB Bundle/Prize-Draw foundation (S21 2026-05-12).
 *
 * Bundles are the new homogeneous-listingType replacement for the legacy
 * `groupedListings` collection. Each bundle holds 3–16 items of the SAME
 * listing type (`standard` xor `pre-order`). Auctions and prize-draws are
 * intentionally excluded — their price/quantity semantics don't compose.
 *
 * id === slug convention enforced; `bundle-` prefix.
 * Stored at top-level `bundles/{bundle-slug}`.
 */

import type { BundleDocument } from "../features/bundles/schemas";
import { BUNDLE_PREFIX } from "./_bundle-constants";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/** Standard-only sample bundle — Pokémon Palace starter pack. */
const pokemonStarterBundle: BundleDocument = {
  id: `${BUNDLE_PREFIX}pokemon-tcg-starter-pack-2026`,
  slug: `${BUNDLE_PREFIX}pokemon-tcg-starter-pack-2026`,
  title: "Pokémon TCG Starter Pack 2026",
  description:
    "A curated 3-item bundle for new Pokémon TCG collectors — a Paldean Fates ETB, a tin of Stellar Crown boosters, and a deck box. Save ₹650 vs buying separately.",
  storeId: "store-pokemon-palace",
  storeName: "Pokémon Palace",
  status: "published",
  bundleItemType: "standard",
  bundleItems: [
    {
      productId: "product-pokemon-sv-etb",
      productSlug: "product-pokemon-sv-etb",
      title: "Pokémon SV Elite Trainer Box",
      listingType: "standard",
      images: [
        "/media/product-image-pokemon-sv-etb-1-20260101.jpg",
      ],
      price: 349900,
      quantity: 1,
      isSold: false,
    },
    {
      productId: "product-pokemon-stellar-crown-tin",
      productSlug: "product-pokemon-stellar-crown-tin",
      title: "Pokémon Stellar Crown Booster Tin",
      listingType: "standard",
      images: [
        "/media/product-image-pokemon-stellar-crown-tin-1-20260101.jpg",
      ],
      price: 199900,
      quantity: 1,
      isSold: false,
    },
    {
      productId: "product-pokemon-deck-box-pikachu",
      productSlug: "product-pokemon-deck-box-pikachu",
      title: "Pokémon Pikachu Deck Box",
      listingType: "standard",
      images: [
        "/media/product-image-pokemon-deck-box-pikachu-1-20260101.jpg",
      ],
      price: 99900,
      quantity: 1,
      isSold: false,
    },
  ],
  bundlePrice: 649900,
  bundleOriginalTotal: 649700,
  currency: "INR",
  category: "Trading Cards",
  categorySlug: "category-pokemon-tcg",
  brandSlug: "brand-pokemon-company",
  tags: ["pokemon", "tcg", "bundle", "starter", "sv-era"],
  images: [
    "/media/bundle-image-pokemon-tcg-starter-pack-2026-1-20260101.jpg",
  ],
  isFeatured: true,
  isPromoted: false,
  maxPerUser: 3,
  partOfBundleProductIds: [
    "product-pokemon-sv-etb",
    "product-pokemon-stellar-crown-tin",
    "product-pokemon-deck-box-pikachu",
  ],
  createdBy: "user-aryan-kapoor",
  createdAt: daysAgo(15),
  updatedAt: daysAgo(2),
};

/** Pre-order-only sample bundle — Gundam Galaxy upcoming PG combo. */
const gunplaPgPreorderBundle: BundleDocument = {
  id: `${BUNDLE_PREFIX}gunpla-pg-arrivals-2026`,
  slug: `${BUNDLE_PREFIX}gunpla-pg-arrivals-2026`,
  title: "Gunpla PG Arrivals — Pre-Order Bundle 2026",
  description:
    "Three Perfect Grade Gunpla pre-orders shipping in the next 4 months. 12% deposit secures all three units. Save ₹1,200 vs individual pre-orders.",
  storeId: "store-gundam-galaxy",
  storeName: "Gundam Galaxy",
  status: "published",
  bundleItemType: "pre-order",
  bundleItems: [
    {
      productId: "preorder-gundam-pg-unicorn-ver15",
      productSlug: "preorder-gundam-pg-unicorn-ver15",
      title: "PG Unicorn Gundam Ver 1.5",
      listingType: "pre-order",
      images: [
        "/media/preorder-image-gundam-pg-unicorn-ver15-1-20260101.jpg",
      ],
      price: 999900,
      quantity: 1,
      isSold: false,
    },
    {
      productId: "preorder-gundam-rg-hi-nu-verka",
      productSlug: "preorder-gundam-rg-hi-nu-verka",
      title: "RG Hi-Nu Gundam VerKa",
      listingType: "pre-order",
      images: [
        "/media/preorder-image-gundam-rg-hi-nu-verka-1-20260101.jpg",
      ],
      price: 499900,
      quantity: 1,
      isSold: false,
    },
    {
      productId: "preorder-shf-broly-super-hero",
      productSlug: "preorder-shf-broly-super-hero",
      title: "S.H.Figuarts Broly Super Hero",
      listingType: "pre-order",
      images: [
        "/media/preorder-image-shf-broly-super-hero-1-20260101.jpg",
      ],
      price: 299900,
      quantity: 1,
      isSold: false,
    },
  ],
  bundlePrice: 1679700,
  bundleOriginalTotal: 1799700,
  currency: "INR",
  category: "Model Kits",
  categorySlug: "category-gundam-perfect-grade",
  brandSlug: "brand-bandai",
  tags: ["gunpla", "pg", "pre-order", "bundle", "bandai"],
  images: [
    "/media/bundle-image-gunpla-pg-arrivals-2026-1-20260101.jpg",
  ],
  isFeatured: false,
  isPromoted: true,
  maxPerUser: 1,
  partOfBundleProductIds: [
    "preorder-gundam-pg-unicorn-ver15",
    "preorder-gundam-rg-hi-nu-verka",
    "preorder-shf-broly-super-hero",
  ],
  createdBy: "user-amit-sharma",
  createdAt: daysAgo(20),
  updatedAt: daysAgo(4),
};

/** Standard-only OOS sample — tests `out_of_stock` UI surface. */
const beybladeOosBundle: BundleDocument = {
  id: `${BUNDLE_PREFIX}beyblade-x-launch-pack-2025`,
  slug: `${BUNDLE_PREFIX}beyblade-x-launch-pack-2025`,
  title: "Beyblade X Launch Pack 2025 (SOLD OUT)",
  description:
    "Four-item Beyblade X launch pack — original 2025 release. One of the four items has sold; bundle marked OOS until restock.",
  storeId: "store-beyblade-arena",
  storeName: "Beyblade Arena",
  status: "out_of_stock",
  bundleItemType: "standard",
  bundleItems: [
    {
      productId: "product-beyblade-x-bx18-leon-crest",
      productSlug: "product-beyblade-x-bx18-leon-crest",
      title: "Beyblade X BX-18 Leon Crest Booster",
      listingType: "standard",
      images: [
        "/media/product-image-beyblade-x-bx18-leon-crest-1-20260101.jpg",
      ],
      price: 199900,
      quantity: 1,
      isSold: false,
    },
    {
      productId: "product-beyblade-x-bx10-dran-dagger",
      productSlug: "product-beyblade-x-bx10-dran-dagger",
      title: "Beyblade X BX-10 Dran Dagger",
      listingType: "standard",
      images: [
        "/media/product-image-beyblade-x-bx10-dran-dagger-1-20260101.jpg",
      ],
      price: 199900,
      quantity: 1,
      isSold: true,
    },
    {
      productId: "product-beyblade-x-launcher-grip",
      productSlug: "product-beyblade-x-launcher-grip",
      title: "Beyblade X String Launcher + Grip",
      listingType: "standard",
      images: [
        "/media/product-image-beyblade-x-launcher-grip-1-20260101.jpg",
      ],
      price: 149900,
      quantity: 1,
      isSold: false,
    },
  ],
  bundlePrice: 499900,
  bundleOriginalTotal: 549700,
  currency: "INR",
  category: "Spinning Tops",
  categorySlug: "category-beyblade-x",
  brandSlug: "brand-takara-tomy",
  tags: ["beyblade-x", "bundle", "launch-pack", "oos"],
  images: [
    "/media/bundle-image-beyblade-x-launch-pack-2025-1-20260101.jpg",
  ],
  isFeatured: false,
  isPromoted: false,
  maxPerUser: 2,
  partOfBundleProductIds: [
    "product-beyblade-x-bx18-leon-crest",
    "product-beyblade-x-bx10-dran-dagger",
    "product-beyblade-x-launcher-grip",
  ],
  createdBy: "user-rohit-joshi",
  createdAt: daysAgo(45),
  updatedAt: daysAgo(10),
};

export const bundlesSeedData: BundleDocument[] = [
  pokemonStarterBundle,
  gunplaPgPreorderBundle,
  beybladeOosBundle,
];
