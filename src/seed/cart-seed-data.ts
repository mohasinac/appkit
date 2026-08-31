/*
 * WHY: Seeds shopping carts for the Beyblade marketplace — tests cart flows (multi-item, single, auction, guest, empty).
 * WHAT: 4 carts: Rehan (3 items from Beyblade Arena), Vivaan (2 items from LetItRip Official/Beyblade Arena), Admin (2 items from Beyblade Arena), guest (2 items).
 *
 * EXPORTS:
 *   cartsSeedData — Array of CartDocument for seed runner
 *
 * @tag domain:cart
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { CartDocument } from "../features/cart/schemas/firestore";
import { getDefaultCurrency } from "./seed-market-config";
import { seedPhoto } from "./_helpers/media";

const _CURRENCY = getDefaultCurrency();
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const cartsSeedData: CartDocument[] = [
  // Rehan's cart: 3 standard items + 1 won-auction (locked) + 1 accepted-offer (locked)
  {
    id: "user-yugi-muto",
    userId: "user-yugi-muto",
    items: [
      {
        itemId: "cartitem-yugi-original-dranzer-s",
        productId: "product-beyblade-original-dranzer-s",
        productTitle: "Beyblade Original Dranzer S",
        productImage: seedPhoto("product-image-original-dranzer-s-1-20260101", 600, 600),
        price: 1799,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
      {
        itemId: "cartitem-yugi-x-bx08-preorder-deposit",
        productId: "preorder-beyblade-x-bx-08-wave",
        productTitle: "Beyblade X BX-08 Wave — Pre-Order",
        productImage: seedPhoto("preorder-image-x-bx08-wave-1-20260101", 600, 600),
        price: 899,
        currency: _CURRENCY,
        quantity: 2,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "pre-order",
        addedAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        itemId: "cartitem-yugi-stadium-set",
        productId: "classified-beyblade-stadium-set",
        productTitle: "Beyblade Stadium Set",
        productImage: seedPhoto("classified-image-stadium-set-1-20260101", 600, 600),
        price: 1299,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        itemId: "cartitem-yugi-dragoon-storm-auction-won",
        productId: "auction-beyblade-original-dragoon-storm",
        productTitle: "Beyblade Original Dragoon Storm — Won Auction",
        productImage: seedPhoto("auction-image-dragoon-storm-1-20260101", 600, 600),
        price: 3499,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "auction",
        locked: true,
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        itemId: "cartitem-yugi-dranzer-offer-accepted",
        productId: "product-beyblade-original-dranzer-s",
        productTitle: "Beyblade Original Dranzer S — Offer Accepted",
        productImage: seedPhoto("product-image-original-dranzer-s-2-20260101", 600, 600),
        price: 1799,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        isOffer: true,
        offerId: "offer-yugi-dranzer-001",
        lockedPrice: 1500,
        locked: true,
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // Vivaan's cart: 2 standard + 1 pre-order
  {
    id: "user-seto-kaiba",
    userId: "user-seto-kaiba",
    items: [
      {
        itemId: "cartitem-kaiba-metal-flame-sagittario",
        productId: "product-beyblade-metal-flame-sagittario",
        productTitle: "Beyblade Metal Flame Sagittario",
        productImage: seedPhoto("product-image-metal-flame-sagittario-1-20260101", 600, 600),
        price: 2299,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
      {
        itemId: "cartitem-kaiba-x-app-unlock",
        productId: "digitalcode-beyblade-x-app-unlock",
        productTitle: "Beyblade X App Unlock Code",
        productImage: seedPhoto("digitalcode-image-x-app-unlock-1-20260101", 600, 600),
        price: 199,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        itemId: "cartitem-kaiba-x-bx08-preorder",
        productId: "preorder-beyblade-x-bx-08-wave",
        productTitle: "Beyblade X BX-08 Wave — Pre-Order",
        productImage: seedPhoto("preorder-image-x-bx08-wave-2-20260101", 600, 600),
        price: 899,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "pre-order",
        addedAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
    ],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  },

  // Admin's cart: 2 items from Beyblade Arena (Admin as buyer)
  {
    id: "user-admin-letitrip",
    userId: "user-admin-letitrip",
    items: [
      {
        itemId: "cartitem-admin-x-knife-shinobi",
        productId: "product-beyblade-x-knife-shinobi",
        productTitle: "Beyblade X Knife Shinobi",
        productImage: seedPhoto("product-image-x-knife-shinobi-1-20260101", 600, 600),
        price: 2999,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        itemId: "cartitem-admin-mystery-box",
        productId: "prizedraw-beyblade-mystery-box",
        productTitle: "Beyblade Mystery Box",
        productImage: seedPhoto("prizedraw-image-mystery-box-1-20260101", 600, 600),
        price: 499,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-letitrip-official",
        storeName: "LetItRip Official",
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
        itemId: "cartitem-guest-metal-storm-pegasus",
        productId: "product-beyblade-metal-storm-pegasus",
        productTitle: "Beyblade Metal Storm Pegasus",
        productImage: seedPhoto("product-image-metal-storm-pegasus-1-20260101", 600, 600),
        price: 2499,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        itemId: "cartitem-guest-burst-valkyrie",
        productId: "product-beyblade-burst-valkyrie",
        productTitle: "Beyblade Burst Valkyrie",
        productImage: seedPhoto("product-image-burst-valkyrie-1-20260101", 600, 600),
        price: 1899,
        currency: _CURRENCY,
        quantity: 1,
        storeId: "store-beyblade-arena",
        storeName: "Beyblade Arena",
        listingType: "standard",
        addedAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
