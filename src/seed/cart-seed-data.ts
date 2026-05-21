/*
 * WHY: Seeds shopping carts for YGO marketplace — tests cart flows (multi-item, single, auction, guest, empty).
 * WHAT: 4 carts: Yugi (3 items from Kaiba store), Kaiba (2 items from Admin store), Admin (2 items from Kaiba store), guest (2 items). All YGO-themed with YGOPRODECK images.
 *
 * EXPORTS:
 *   cartsSeedData — Array of CartDocument for seed runner
 *
 * @tag domain:cart
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { CartDocument } from "../features/cart/schemas/firestore";
import { getDefaultCurrency } from "./seed-market-config";

const _CURRENCY = getDefaultCurrency();
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const cartsSeedData: CartDocument[] = [
  // Yugi's cart: 3 items from Kaiba Corp Card Vault
  {
    id: "user-yugi-muto",
    userId: "user-yugi-muto",
    items: [
      {
        itemId: "cartitem-yugi-dark-magician-lob-1st",
        productId: "product-dark-magician-lob-1st",
        productTitle: "Dark Magician LOB 1st Edition",
        productImage: "https://images.ygoprodeck.com/images/cards/small/46986414.jpg",
        price: 499900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        itemId: "cartitem-yugi-lob-booster-pack",
        productId: "product-lob-booster-pack",
        productTitle: "Legend of Blue Eyes Booster Pack",
        productImage: "https://images.ygoprodeck.com/images/cards/small/89631139.jpg",
        price: 149900,
        currency: _CURRENCY,
        quantity: 2,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        itemId: "cartitem-yugi-kuriboh-mrd",
        productId: "product-kuriboh-mrd",
        productTitle: "Kuriboh MRD",
        productImage: "https://images.ygoprodeck.com/images/cards/small/40640057.jpg",
        price: 29900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // Kaiba's cart: 2 items from LetItRip Official (Kaiba as buyer)
  {
    id: "user-seto-kaiba",
    userId: "user-seto-kaiba",
    items: [
      {
        itemId: "cartitem-kaiba-duelist-kingdom-playmat",
        productId: "product-duelist-kingdom-playmat",
        productTitle: "Duelist Kingdom Playmat",
        productImage: "https://images.ygoprodeck.com/images/cards/small/10000015.jpg",
        price: 129900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-letitrip-official",
        storeName: "LetItRip Official",
        listingType: "standard",
        addedAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
      {
        itemId: "cartitem-kaiba-exodia-art-print",
        productId: "product-exodia-art-print",
        productTitle: "Exodia Art Print A3",
        productImage: "https://images.ygoprodeck.com/images/cards/small/33396948.jpg",
        price: 79900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-letitrip-official",
        storeName: "LetItRip Official",
        listingType: "standard",
        addedAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
    ],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },

  // Admin's cart: 2 items from Kaiba Corp (Admin as buyer)
  {
    id: "user-admin-letitrip",
    userId: "user-admin-letitrip",
    items: [
      {
        itemId: "cartitem-admin-chaos-emperor",
        productId: "product-chaos-emperor-dragon",
        productTitle: "Chaos Emperor Dragon — Envoy of the End",
        productImage: "https://images.ygoprodeck.com/images/cards/small/82301904.jpg",
        price: 1299900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        itemId: "cartitem-admin-potd-box",
        productId: "product-potd-booster-box",
        productTitle: "Power of the Duelist Booster Box 24pk",
        productImage: "https://images.ygoprodeck.com/images/cards/small/89943723.jpg",
        price: 2299900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // Guest cart: 2 items, no userId
  {
    id: "guest-session-001",
    userId: "",
    items: [
      {
        itemId: "cartitem-guest-mirror-force",
        productId: "product-mirror-force-mrd",
        productTitle: "Mirror Force MRD Ultra Rare",
        productImage: "https://images.ygoprodeck.com/images/cards/small/44095762.jpg",
        price: 999900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        itemId: "cartitem-guest-yugi-starter",
        productId: "product-yugi-starter-deck",
        productTitle: "Starter Deck: Yugi",
        productImage: "https://images.ygoprodeck.com/images/cards/small/46986414.jpg",
        price: 199900,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-kaiba-corp-cards",
        storeName: "Kaiba Corp Card Vault",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
