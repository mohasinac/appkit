import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

/**
 * Carts Seed Data — LetItRip Collectibles
 *
 * Covers all cart states for testing Add-to-Cart / Update / Remove / Checkout flows:
 *   — Multi-item cart (cross-store, mixed categories) — Rahul Sharma
 *   — Single-item cart                                — Priya Patel
 *   — Cart with auction item                          — Arjun Singh
 *   — Cart with quantity > 1                          — Meera Nair
 *   — Empty cart (items: [])                          — Amit Sharma
 *
 * Cart document ID = userId (O(1) lookup — see cart.ts schema).
 *
 * All FK references:
 *   userId             → users/{uid}  (see users-seed-data.ts)
 *   items[].productId  → products/{id} (see products-standard/auctions-seed-data.ts)
 *   items[].storeId    → stores/{id}  (see stores-seed-data.ts)
 */

import type { CartDocument } from "../features/cart/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const cartsSeedData: CartDocument[] = [
  // -- Rahul Sharma: multi-item, cross-store cart ----------------------------
  // Tests: list cart items, remove single item, update quantity, checkout
  {
    id: "user-rahul-sharma",
    userId: "user-rahul-sharma",
    items: [
      {
        itemId: "cartitem-rahul-pokemon-etb-001",
        productId: "product-pokemon-sv-etb",
        productTitle: "Pokémon Scarlet & Violet Elite Trainer Box",
        productImage: "/media/product-image-pokemon-sv-etb-1-20260101.jpg",
        price: 349900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-pokemon-palace",
        storeName: "Pokémon Palace",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
      {
        itemId: "cartitem-rahul-hotwheels-001",
        productId: "product-hot-wheels-redline-1969-camaro",
        productTitle: "Hot Wheels Redline 1969 Camaro (Original)",
        productImage: "/media/product-image-hot-wheels-redline-1969-camaro-1-20260101.jpg",
        price: 189900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-diecast-depot",
        storeName: "Diecast Depot",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
      {
        itemId: "cartitem-rahul-beyblade-001",
        productId: "product-beyblade-x-bx01-dran-sword",
        productTitle: "Beyblade X BX-01 Dran Sword 3-60F Starter",
        productImage: "/media/product-image-beyblade-x-bx01-dran-sword-1-20260101.jpg",
        price: 179900,
        currency: _CURRENCY,
        quantity: 2,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
    ],
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },

  // -- Priya Patel: single-item cart -----------------------------------------
  // Tests: add item, checkout with single item, clear cart after order
  {
    id: "user-priya-patel",
    userId: "user-priya-patel",
    items: [
      {
        itemId: "cartitem-priya-goku-001",
        productId: "product-shf-goku-ultra-instinct",
        productTitle: "S.H.Figuarts Goku Ultra Instinct (Dragon Ball Super)",
        productImage: "/media/product-image-shf-goku-ultra-instinct-1-20260101.jpg",
        price: 449900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-letitrip-official",
        storeName: "LetItRip Official",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(10),
        updatedAt: daysAgo(10),
      },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // -- Arjun Singh: cart with auction item ------------------------------------
  // Tests: auction item add-to-cart display, checkout CTA blocked (must bid)
  {
    id: "user-arjun-singh",
    userId: "user-arjun-singh",
    items: [
      {
        itemId: "cartitem-arjun-pokemon-base-auction-001",
        productId: "auction-pokemon-base-set-booster-box",
        productTitle: "Pokémon Base Set 1st Edition Booster Box (SEALED AUCTION)",
        productImage: "/media/auction-image-pokemon-base-set-booster-box-1-20260101.jpg",
        price: 45000000,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-pokemon-palace",
        storeName: "Pokémon Palace",
        isAuction: true,
        isPreOrder: false,
        addedAt: daysAgo(17),
        updatedAt: daysAgo(17),
      },
      {
        itemId: "cartitem-arjun-yugioh-tin-001",
        productId: "product-yugioh-25th-tin",
        productTitle: "Yu-Gi-Oh! 25th Anniversary Tin: Dueling Heroes",
        productImage: "/media/product-image-yugioh-25th-tin-1-20260101.jpg",
        price: 299900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-cardgame-hub",
        storeName: "CardGame Hub",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(12),
        updatedAt: daysAgo(12),
      },
    ],
    createdAt: daysAgo(17),
    updatedAt: daysAgo(12),
  },

  // -- Meera Nair: cart with quantity > 1 items ------------------------------
  // Tests: increment/decrement quantity controls, cart total calculation
  {
    id: "user-meera-nair",
    userId: "user-meera-nair",
    items: [
      {
        itemId: "cartitem-meera-pokemon151-001",
        productId: "product-pokemon-151-booster-box",
        productTitle: "Pokémon 151 Booster Box (Japanese)",
        productImage: "/media/product-image-pokemon-151-booster-box-1-20260101.jpg",
        price: 699900,
        currency: _CURRENCY,
        quantity: 3,
        storeId: "store-pokemon-palace",
        storeName: "Pokémon Palace",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
      {
        itemId: "cartitem-meera-hotwheels5pack-001",
        productId: "product-hot-wheels-premium-5pack",
        productTitle: "Hot Wheels Premium Car Culture 5-Pack",
        productImage: "/media/product-image-hot-wheels-premium-5pack-1-20260101.jpg",
        price: 149900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-diecast-depot",
        storeName: "Diecast Depot",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
    ],
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },

  // -- Amit Sharma: empty cart (all items removed) ----------------------------
  // Tests: empty cart UI state, "Your cart is empty" message,
  //        add-to-cart starting from empty state
  {
    id: "user-amit-sharma",
    userId: "user-amit-sharma",
    items: [],
    createdAt: daysAgo(27),
    updatedAt: daysAgo(9),
  },

  // ── P29 expansion (S17 2026-05-12) — 15 more carts via helper ───────────
  ...mkCart("user-kavya-iyer", 6, [
    {
      productId: "product-pokemon-151-booster-box",
      title: "Pokémon 151 Booster Box (36-pack)",
      price: 1799900,
      store: ["store-pokemon-palace", "Pokémon Palace"],
      qty: 1,
    },
  ]),
  ...mkCart("user-sneha-kumar", 12, [
    {
      productId: "product-hot-wheels-treasure-hunt-2024",
      title: "Hot Wheels 2024 Treasure Hunt (Single)",
      price: 49900,
      store: ["store-diecast-depot", "Diecast Depot"],
      qty: 2,
    },
    {
      productId: "product-funko-pop-naruto-sage-mode",
      title: "Funko Pop Naruto Sage Mode",
      price: 129900,
      store: ["store-tokyo-toys-india", "Tokyo Toys India"],
      qty: 1,
    },
  ]),
  ...mkCart("user-kartik-nair", 3, [
    {
      productId: "product-beyblade-x-bx18-leon-crest",
      title: "Beyblade X BX-18 Leon Crest Booster",
      price: 199900,
      store: ["store-beyblade-arena", "Beyblade Arena"],
      qty: 1,
    },
  ]),
  ...mkCart("user-divya-menon", 8, [
    {
      productId: "preorder-pokemon-stellar-crown-etb",
      title: "PRE-ORDER: Pokémon Stellar Crown ETB",
      price: 599900,
      store: ["store-pokemon-palace", "Pokémon Palace"],
      qty: 1,
      isPreOrder: true,
    },
  ]),
  ...mkCart("user-ankit-gupta", 14, [
    {
      productId: "product-gundam-rg-nu-gundam",
      title: "Bandai RG 1/144 Nu Gundam",
      price: 449900,
      store: ["store-gundam-galaxy", "Gundam Galaxy"],
      qty: 1,
    },
    {
      productId: "product-gunpla-action-base-clear",
      title: "Gunpla Action Base Clear (Display Stand)",
      price: 59900,
      store: ["store-gundam-galaxy", "Gundam Galaxy"],
      qty: 2,
    },
  ]),
  ...mkCart("user-siddharth-rao", 5, [
    {
      productId: "product-shf-luffy-gear-5",
      title: "S.H.Figuarts Luffy Gear 5",
      price: 1199900,
      store: ["store-tokyo-toys-india", "Tokyo Toys India"],
      qty: 1,
    },
  ]),
  ...mkCart("user-tanvi-desai", 2, [
    {
      productId: "product-yugioh-25th-quarter-century-tin",
      title: "Yu-Gi-Oh! 25th Quarter Century Stampede Tin",
      price: 599900,
      store: ["store-cardgame-hub", "CardGame Hub"],
      qty: 1,
    },
    {
      productId: "product-yugioh-rarity-collection-pack",
      title: "Yu-Gi-Oh! Rarity Collection Pack",
      price: 119900,
      store: ["store-cardgame-hub", "CardGame Hub"],
      qty: 3,
    },
  ]),
  ...mkCart("user-anjali-verma", 1, [
    {
      productId: "product-pokemon-charizard-ex-obsidian",
      title: "Pokémon Charizard ex Obsidian Flames Hyper Rare",
      price: 1499900,
      store: ["store-cardgame-hub", "CardGame Hub"],
      qty: 1,
    },
  ]),
  ...mkCart("user-rohit-verma", 7, [
    {
      productId: "product-tomica-limited-vintage-skyline",
      title: "Tomica Limited Vintage Nissan Skyline GT-R",
      price: 349900,
      store: ["store-vintage-vault", "Vintage Vault"],
      qty: 1,
    },
  ]),
  ...mkCart("user-pooja-sharma", 4, [
    {
      productId: "auction-pokemon-lugia-neo-genesis-psa9",
      title: "Pokémon Neo Genesis Lugia #9 PSA 9 (AUCTION)",
      price: 6999900,
      store: ["store-pokemon-palace", "Pokémon Palace"],
      qty: 1,
      isAuction: true,
    },
  ]),
  // Guest carts skipped — sessionId is a runtime-only optional field on the
  // Zod input but not on the `CartDocument` interface used by the seed array.
  // Guest cart behavior is exercised at runtime via localStorage merge tests.
];

interface CartItemSpec {
  productId: string;
  title: string;
  price: number;
  store: [string, string];
  qty: number;
  isAuction?: boolean;
  isPreOrder?: boolean;
}

/**
 * Compact constructor for authenticated user carts. Each item gets a
 * deterministic itemId derived from the cart id + product id so the seed
 * is idempotent across re-runs.
 */
function mkCart(
  userId: string,
  ageDays: number,
  items: CartItemSpec[],
): CartDocument[] {
  const created = daysAgo(ageDays);
  return [
    {
      id: userId,
      userId,
      items: items.map((it) => ({
        itemId: `cartitem-${userId.replace("user-", "")}-${it.productId.split("-").slice(-3).join("-")}`,
        productId: it.productId,
        productTitle: it.title,
        productImage: `/media/${it.productId.startsWith("auction-") ? "auction" : it.productId.startsWith("preorder-") ? "preorder" : "product"}-image-${it.productId.replace(/^(auction|preorder|product)-/, "")}-1-20260101.jpg`,
        price: it.price,
        currency: _CURRENCY,
        quantity: it.qty,
        storeId: it.store[0],
        storeName: it.store[1],
        isAuction: it.isAuction ?? false,
        isPreOrder: it.isPreOrder ?? false,
        addedAt: created,
        updatedAt: created,
      })),
      createdAt: created,
      updatedAt: created,
    },
  ];
}

