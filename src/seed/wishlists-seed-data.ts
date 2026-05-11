/**
 * Wishlist Seed Data
 * One document per user+product pair, stored under users/{uid}/wishlist/{productId}.
 * All userId and productId values verified against users-seed-data.ts and
 * products-standard-seed-data.ts / products-auctions-seed-data.ts / products-preorders-seed-data.ts.
 */

export interface WishlistSeedDocument {
  userId: string;
  productId: string;
  addedAt: Date;
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const wishlistsSeedData: WishlistSeedDocument[] = [
  // ── Rahul Sharma (buyer) — Pokémon TCG & vintage ─────────────────────────
  {
    userId: "user-rahul-sharma",
    productId: "product-pokemon-sv-etb",
    addedAt: daysAgo(10),
  },
  {
    userId: "user-rahul-sharma",
    productId: "product-vintage-pokemon-charizard-base-lp",
    addedAt: daysAgo(7),
  },
  {
    userId: "user-rahul-sharma",
    productId: "auction-pokemon-charizard-base1-psa9",
    addedAt: daysAgo(5),
  },

  // ── Priya Patel (buyer) — Hot Wheels & diecast ───────────────────────────
  {
    userId: "user-priya-patel",
    productId: "product-hot-wheels-redline-1969-camaro",
    addedAt: daysAgo(12),
  },
  {
    userId: "user-priya-patel",
    productId: "product-hot-wheels-rlc-bone-shaker",
    addedAt: daysAgo(8),
  },
  {
    userId: "user-priya-patel",
    productId: "auction-hot-wheels-redline-camaro-pink",
    addedAt: daysAgo(3),
  },

  // ── Arjun Singh (buyer) — Beyblade ───────────────────────────────────────
  {
    userId: "user-arjun-singh",
    productId: "product-beyblade-x-bx01-dran-sword",
    addedAt: daysAgo(6),
  },
  {
    userId: "user-arjun-singh",
    productId: "product-beyblade-burst-b200-valkyrie",
    addedAt: daysAgo(4),
  },

  // ── Meera Nair (buyer) — Anime figures ───────────────────────────────────
  {
    userId: "user-meera-nair",
    productId: "product-shf-goku-ultra-instinct",
    addedAt: daysAgo(9),
  },
  {
    userId: "user-meera-nair",
    productId: "product-nendoroid-rem-rezero",
    addedAt: daysAgo(5),
  },
  {
    userId: "user-meera-nair",
    productId: "product-gsc-racing-miku-2023",
    addedAt: daysAgo(2),
  },

  // ── Kavya Iyer (buyer) — Gunpla ──────────────────────────────────────────
  {
    userId: "user-kavya-iyer",
    productId: "product-gundam-rx78-mg",
    addedAt: daysAgo(14),
  },
  {
    userId: "user-kavya-iyer",
    productId: "product-gundam-wing-zero-rg",
    addedAt: daysAgo(9),
  },
  {
    userId: "user-kavya-iyer",
    productId: "preorder-gundam-pg-unicorn-ver15",
    addedAt: daysAgo(4),
  },

  // ── Sneha Kumar (buyer) — Trading cards ──────────────────────────────────
  {
    userId: "user-sneha-kumar",
    productId: "product-yugioh-25th-tin",
    addedAt: daysAgo(11),
  },
  {
    userId: "user-sneha-kumar",
    productId: "product-pokemon-151-booster-box",
    addedAt: daysAgo(6),
  },

  // ── Kartik Nair (buyer) — Vintage & rare ─────────────────────────────────
  {
    userId: "user-kartik-nair",
    productId: "product-vintage-hot-wheels-deora-1968",
    addedAt: daysAgo(13),
  },
  {
    userId: "user-kartik-nair",
    productId: "product-vintage-motu-he-man-1982",
    addedAt: daysAgo(7),
  },

  // ── Divya Menon (buyer) — Pre-orders ─────────────────────────────────────
  {
    userId: "user-divya-menon",
    productId: "preorder-beyblade-x-bx10-booster",
    addedAt: daysAgo(3),
  },
  {
    userId: "user-divya-menon",
    productId: "preorder-shf-broly-super-hero",
    addedAt: daysAgo(1),
  },
];
