/**
 * Sublisting Categories Seed Data
 * 12 curated sub-listing buckets across all LetItRip collectible verticals.
 * id === slug, prefix: sublisting-
 */

import type { SublistingCategoryDocument } from "../features/products/schemas/sublisting-categories";

const NOW = new Date("2026-05-10T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const ADMIN_ID = "user-admin-letitrip";

export const sublistingCategoriesSeedData: SublistingCategoryDocument[] = [
  // ── Trading Cards / Pokémon ──────────────────────────────────────────────
  {
    id: "sublisting-pokemon-base-set",
    slug: "sublisting-pokemon-base-set",
    name: "Base Set (102/102)",
    itemCode: "BS-102",
    description:
      "All 102 Base Set Pokémon TCG cards — Shadowless, 1st Edition, and Unlimited. The original 1999 Wizards of the Coast set that launched the entire hobby.",
    coverImage: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
    createdBy: ADMIN_ID,
  },
  {
    id: "sublisting-pokemon-psa-graded",
    slug: "sublisting-pokemon-psa-graded",
    name: "PSA Graded Pokémon Cards",
    itemCode: "PSA",
    description:
      "Investment-grade Pokémon cards authenticated and slabbed by PSA. Grades 7 through 10 Gem Mint. Authenticity guaranteed.",
    coverImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(55),
    updatedAt: daysAgo(2),
    createdBy: ADMIN_ID,
  },
  {
    id: "sublisting-pokemon-sealed-boxes",
    slug: "sublisting-pokemon-sealed-boxes",
    name: "Sealed Pokémon Booster Boxes",
    description:
      "Factory-sealed Pokémon TCG booster boxes. Current sets, vintage boxes, and Japanese exclusives. All shrinkwrap-intact.",
    coverImage: "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(50),
    updatedAt: daysAgo(3),
    createdBy: ADMIN_ID,
  },

  // ── Diecast Vehicles / Hot Wheels ────────────────────────────────────────
  {
    id: "sublisting-hotwheels-redlines",
    slug: "sublisting-hotwheels-redlines",
    name: "Hot Wheels Vintage Redlines (1968–1977)",
    itemCode: "Redline",
    description:
      "Original Hot Wheels Redline-era cars from the first decade of production. US cards, Hong Kong manufacturing, rare colour variants.",
    coverImage: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(38),
    updatedAt: daysAgo(1),
    createdBy: ADMIN_ID,
  },
  {
    id: "sublisting-hotwheels-super-treasure-hunts",
    slug: "sublisting-hotwheels-super-treasure-hunts",
    name: "Hot Wheels Super Treasure Hunts",
    itemCode: "STH",
    description:
      "The rarest regular production Hot Wheels releases — Real Riders tyres, spectraflame paint, Treasure Hunt logo. One per case.",
    coverImage: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(2),
    createdBy: ADMIN_ID,
  },

  // ── Spinning Tops / Beyblade ─────────────────────────────────────────────
  {
    id: "sublisting-beyblade-x-series",
    slug: "sublisting-beyblade-x-series",
    name: "Beyblade X Series (2023+)",
    itemCode: "BX",
    description:
      "All Beyblade X generation products — the new xtreme dash ratchet system. BX-01 onward. Official Takara Tomy Japan import.",
    coverImage: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
    createdBy: ADMIN_ID,
  },

  // ── Model Kits / Gundam ──────────────────────────────────────────────────
  {
    id: "sublisting-gundam-master-grade",
    slug: "sublisting-gundam-master-grade",
    name: "Gundam Master Grade (MG) 1/100",
    itemCode: "MG",
    description:
      "Bandai Gundam MG 1/100 kits with full inner frame. Intermediate to advanced builders. UC, SEED, 00, IBO ranges.",
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
    createdBy: ADMIN_ID,
  },
  {
    id: "sublisting-gundam-high-grade",
    slug: "sublisting-gundam-high-grade",
    name: "Gundam High Grade (HG) 1/144",
    itemCode: "HG",
    description:
      "Entry-level Bandai Gundam HG 1/144 kits. Best for beginners or builders who want quick builds. Huge selection across all series.",
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(4),
    createdBy: ADMIN_ID,
  },

  // ── Action Figures / Anime ───────────────────────────────────────────────
  {
    id: "sublisting-nendoroid-early-series",
    slug: "sublisting-nendoroid-early-series",
    name: "Nendoroid Early Series (#001–#100)",
    itemCode: "GSC-001-100",
    description:
      "Discontinued Good Smile Company Nendoroid figures #001–#100. Many are rare, OOP, and command a premium on the secondary market.",
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(2),
    createdBy: ADMIN_ID,
  },
  {
    id: "sublisting-shf-dragonball",
    slug: "sublisting-shf-dragonball",
    name: "S.H.Figuarts Dragon Ball Series",
    itemCode: "SHF-DBZ",
    description:
      "Bandai S.H.Figuarts Dragon Ball Z and Super articulated figures. Goku, Vegeta, Gohan, Piccolo, Frieza — ultra-articulated with premium accessories.",
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(25),
    updatedAt: daysAgo(1),
    createdBy: ADMIN_ID,
  },

  // ── Vintage & Rare ───────────────────────────────────────────────────────
  {
    id: "sublisting-vintage-wotc-era",
    slug: "sublisting-vintage-wotc-era",
    name: "WOTC Era Pokémon (1999–2003)",
    itemCode: "WOTC",
    description:
      "All Wizards of the Coast era Pokémon TCG sets: Base Set through Legendary Collection. Raw and graded copies accepted.",
    coverImage: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
    createdBy: ADMIN_ID,
  },
  {
    id: "sublisting-yugioh-lob-1st-edition",
    slug: "sublisting-yugioh-lob-1st-edition",
    name: "Yu-Gi-Oh! LOB 1st Edition",
    itemCode: "LOB-1E",
    description:
      "Legend of Blue-Eyes White Dragon 1st Edition singles. Blue-Eyes, Dark Magician, Exodia pieces — iconic WOTC-era Yu-Gi-Oh! from 2002.",
    coverImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&h=600&fit=crop",
    productCount: 0,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(5),
    createdBy: ADMIN_ID,
  },
];
