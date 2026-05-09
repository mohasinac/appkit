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
];
