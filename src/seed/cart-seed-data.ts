/*
 * WHY: Shopping carts, pruned to the two that exist in production.
 * WHAT: 2 carts — Rehan and Admin. Vivaan's and the guest cart were removed;
 * neither is live.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-22 — the second pass, which caught what the
 * first missed. The rows here were GENERATED (a `.push()` loop, a spread of a
 * generator call, or a factory call with a template-literal id), so a static
 * scan of the array literal read `0` while the loader wrote dozens. The only
 * authority on what a load writes is `npx appkit-seed load --dry-run`.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test".
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
        /*
         * 🛑 `isAuctionWin` is what puts this line in the AUCTION lane.
         *
         * `laneOf()` keys on `isAuctionWin || bidId` — `listingType: "auction"`
         * and `locked: true` mean nothing to it. Without this flag the line fell
         * into the STANDARD lane, so the cart's "Won Auctions" tab was empty
         * while a non-removable auction line sat in the ordinary cart inflating
         * its total, and the lane gate never blocked anything. Found by the
         * tester 2026-09-06.
         */
        isAuctionWin: true,
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

  // Removed 2026-10-22: the guest cart (`guest-session-001`) and Vivaan's
  // (`user-seto-kaiba`). Neither is live, and live is canonical.
];
