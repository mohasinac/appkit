import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();

/**
 * Carts Seed Data — Pokemon TCG Themed
 *
 * Covers all cart states for testing Add-to-Cart / Update / Remove / Checkout flows:
 *   — Multi-item cart (cross-seller, mixed categories) — Ash Ketchum
 *   — Single-item cart                                — Gary Oak
 *   — Cart with an auction item                       — Brock
 *   — Cart with quantity > 1                          — Sabrina
 *   — Empty cart (items: [])                          — Erika
 *
 * Cart document ID = userId (O(1) lookup — see cart.ts schema).
 *
 * All FK references:
 *   userId             → users/{uid}  (see pokemon-users-seed-data.ts)
 *   items[].productId  → products/{id} (see pokemon-products-seed-data.ts)
 *   items[].sellerId   → users/{uid}  (see pokemon-users-seed-data.ts)
 */

import type { CartDocument } from "../features/cart/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const cartsSeedData: CartDocument[] = [
  // -- Ash Ketchum: multi-item, cross-seller cart ----------------------------
  // Tests: list cart items, remove single item, update quantity, checkout
  {
    id: "user-ash-ketchum-pallet-ash",
    userId: "user-ash-ketchum-pallet-ash",
    items: [
      {
        itemId: "cartitem-ash-charizard-001",
        productId: "product-charizard-base1-4-holo-rare-fire-blaine-1",
        productTitle: "Charizard — Base Set #4 Holo Rare (Near Mint)",
        productImage: "https://images.pokemontcg.io/base1/4_hires.png",
        price: 89999,
        currency: _CURRENCY,
        quantity: 1,
        sellerId: "user-blaine-fire-gym-blaine",
        sellerName: "Blaine's Fire Shoppe",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
      {
        itemId: "cartitem-ash-pikachu-001",
        productId: "product-pikachu-base1-58-common-electric-surge-1",
        productTitle: "Pikachu — Base Set #58 Common (Near Mint)",
        productImage: "https://images.pokemontcg.io/base1/58_hires.png",
        price: 1999,
        currency: _CURRENCY,
        quantity: 1,
        sellerId: "user-lt-surge-electric-surge",
        sellerName: "Surge's Electric Emporium",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
      {
        itemId: "cartitem-ash-sleeves-001",
        productId: "product-pokemon-card-sleeves-standard-blaine-1",
        productTitle: "Pokemon-Art Card Sleeves (100-pack, Pikachu)",
        productImage: "https://images.pokemontcg.io/base1/58_hires.png",
        price: 699,
        currency: _CURRENCY,
        quantity: 2, // buying 2 packs
        sellerId: "user-blaine-fire-gym-blaine",
        sellerName: "Blaine's Fire Shoppe",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
    ],
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },

  // -- Gary Oak: single-item cart -------------------------------------------
  // Tests: add item, checkout with single item, clear cart after order
  {
    id: "user-gary-oak-pallet-gary",
    userId: "user-gary-oak-pallet-gary",
    items: [
      {
        itemId: "cartitem-gary-mewtwo-001",
        productId: "product-mewtwo-base1-10-holo-rare-psychic-surge-1",
        productTitle: "Mewtwo — Base Set #10 Holo Rare (Near Mint)",
        productImage: "https://images.pokemontcg.io/base1/10_hires.png",
        price: 19999,
        currency: _CURRENCY,
        quantity: 1,
        sellerId: "user-lt-surge-electric-surge",
        sellerName: "Surge's Electric Emporium",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(10),
        updatedAt: daysAgo(10),
      },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // -- Brock: cart with auction item ----------------------------------------
  // Tests: auction item add-to-cart display, checkout CTA blocked (must bid)
  {
    id: "user-brock-pewter-brock",
    userId: "user-brock-pewter-brock",
    items: [
      {
        itemId: "cartitem-brock-charizard-auction-001",
        productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
        productTitle:
          "1st Edition Charizard — Base Set #4 Holo (AUCTION, PSA 7)",
        productImage: "https://images.pokemontcg.io/base1/4_hires.png",
        price: 299999, // starting bid price captured at add time
        currency: _CURRENCY,
        quantity: 1,
        sellerId: "user-blaine-fire-gym-blaine",
        sellerName: "Blaine's Fire Shoppe",
        isAuction: true,
        isPreOrder: false,
        addedAt: daysAgo(17),
        updatedAt: daysAgo(17),
      },
      {
        itemId: "cartitem-brock-water-energy-001",
        productId: "product-water-energy-base1-99-common-energy-misty-lot",
        productTitle: "Water Energy — Base Set #99 x10 Lot (Near Mint)",
        productImage: "https://images.pokemontcg.io/base1/99_hires.png",
        price: 999,
        currency: _CURRENCY,
        quantity: 1,
        sellerId: "user-misty-water-gym-misty",
        sellerName: "Misty's Water Cards",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(12),
        updatedAt: daysAgo(12),
      },
    ],
    createdAt: daysAgo(17),
    updatedAt: daysAgo(12),
  },

  // -- Sabrina: cart with quantity > 1 items ---------------------------------
  // Tests: increment/decrement quantity controls, cart total calculation
  {
    id: "user-sabrina-saffron-sabrina",
    userId: "user-sabrina-saffron-sabrina",
    items: [
      {
        itemId: "cartitem-sabrina-haunter-001",
        productId: "product-haunter-base1-24-non-holo-rare-psychic-surge-1",
        productTitle: "Haunter — Base Set #24 Non-Holo Rare (Near Mint)",
        productImage: "https://images.pokemontcg.io/base1/24_hires.png",
        price: 1499,
        currency: _CURRENCY,
        quantity: 3, // buying 3 for trade
        sellerId: "user-lt-surge-electric-surge",
        sellerName: "Surge's Electric Emporium",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
      {
        itemId: "cartitem-sabrina-prof-oak-001",
        productId:
          "product-professor-oak-base1-88-uncommon-trainer-surge-1",
        productTitle: "Professor Oak — Base Set #88 Trainer (Near Mint)",
        productImage: "https://images.pokemontcg.io/base1/88_hires.png",
        price: 2499,
        currency: _CURRENCY,
        quantity: 1,
        sellerId: "user-lt-surge-electric-surge",
        sellerName: "Surge's Electric Emporium",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
    ],
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },

  // -- Erika: empty cart (all items removed) ---------------------------------
  // Tests: empty cart UI state, "Your cart is empty" message,
  //        add-to-cart starting from empty state
  {
    id: "user-erika-celadon-erika",
    userId: "user-erika-celadon-erika",
    items: [],
    createdAt: daysAgo(27),
    updatedAt: daysAgo(9),
  },
];
