/**
 * Carts Seed Data
 *
 * Covers all cart states for testing Add-to-Cart / Update / Remove / Checkout flows:
 *   — Multi-item cart (cross-seller, mixed categories) — John Doe
 *   — Single-item cart                                — Jane Smith
 *   — Cart with an auction item                       — Mike Johnson
 *   — Cart with quantity > 1                          — Priya Sharma
 *   — Empty cart (items: [])                          — Raj Patel
 *
 * Cart document ID = userId (O(1) lookup — see cart.ts schema).
 *
 * All FK references:
 *   userId             → users/{uid}  (see users-seed-data.ts)
 *   items[].productId  → products/{id} (see products-seed-data.ts)
 *   items[].sellerId   → users/{uid}  (see users-seed-data.ts)
 */

import type { CartDocument } from "../features/cart/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const cartsSeedData: CartDocument[] = [
  // ── John Doe: multi-item, cross-seller cart ───────────────────────────────
  // Tests: list cart items, remove single item, update quantity, checkout
  {
    id: "user-john-doe-johndoe",
    userId: "user-john-doe-johndoe",
    items: [
      {
        itemId: "cartitem-john-iphone-001",
        productId:
          "product-iphone-15-pro-max-smartphones-new-techhub-electronics-1",
        productTitle: "Dragon Ball Super Saiyan Blue Goku 1/4 Scale Figure",
        productImage:
          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop",
        price: 12490,
        currency: "INR",
        quantity: 1,
        sellerId: "user-techhub-electronics-electron",
        sellerName: "FigureVault JP",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
      {
        itemId: "cartitem-john-yoga-001",
        productId: "product-premium-yoga-mat-sports-new-sportszone-1",
        productTitle: "Naruto Sage Mode Toad Sage 1/7 Scale Figure",
        productImage:
          "https://images.unsplash.com/photo-1599447292325-2a765f31b759?w=400&h=400&fit=crop",
        price: 3999,
        currency: "INR",
        quantity: 1,
        sellerId: "user-home-essentials-homeesse",
        sellerName: "OtakuShelf Co",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
      {
        itemId: "cartitem-john-charger-001",
        productId: "product-anker-usbc-charger-electronics-new-techhub-1",
        productTitle: "Spirited Away No-Face Resin Miniature Twin Pack",
        productImage:
          "https://images.unsplash.com/photo-1591209733349-e1b6e42f4e97?w=400&h=400&fit=crop",
        price: 1290,
        currency: "INR",
        quantity: 2, // quantity > 1 edge case
        sellerId: "user-techhub-electronics-electron",
        sellerName: "FigureVault JP",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
    ],
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },

  // ── Jane Smith: single-item cart ─────────────────────────────────────────
  // Tests: add item, checkout with single item, clear cart after order
  {
    id: "user-jane-smith-janes",
    userId: "user-jane-smith-janes",
    items: [
      {
        itemId: "cartitem-jane-kurti-001",
        productId:
          "product-womens-anarkali-kurta-fashion-new-fashionboutique-1",
        productTitle: "Sailor Moon Neo Queen Serenity Cosplay Dress Set",
        productImage:
          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop",
        price: 2899,
        currency: "INR",
        quantity: 1,
        sellerId: "user-fashion-boutique-fashionb",
        sellerName: "AnimeCraft Apparel",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(10),
        updatedAt: daysAgo(10),
      },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // ── Mike Johnson: cart with auction item ──────────────────────────────────
  // Tests: auction item add-to-cart display, checkout CTA blocked (must bid)
  // The Air Jordan auction closes 2026-03-01 20:00 so it's still active now.
  {
    id: "user-mike-johnson-mikejohn",
    userId: "user-mike-johnson-mikejohn",
    items: [
      {
        itemId: "cartitem-mike-jordan-001",
        productId: "product-limited-air-jordan-sneakers-auction-artisan-1",
        productTitle: "Naruto Complete Bijuu (9 Tailed Beasts) Set — ENDED",
        productImage:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
        price: 50000, // starting bid price captured at add time
        currency: "INR",
        quantity: 1,
        sellerId: "user-home-essentials-homeesse",
        sellerName: "OtakuShelf Co",
        isAuction: true,
        isPreOrder: false,
        addedAt: daysAgo(17),
        updatedAt: daysAgo(17),
      },
      {
        itemId: "cartitem-mike-cookware-001",
        productId: "product-nonstick-cookware-set-home-new-homeessentials-1",
        productTitle: "Attack on Titan 3D Maneuver Gear Wall Replica",
        productImage:
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",
        price: 3799,
        currency: "INR",
        quantity: 1,
        sellerId: "user-home-essentials-homeesse",
        sellerName: "OtakuShelf Co",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(12),
        updatedAt: daysAgo(12),
      },
    ],
    createdAt: daysAgo(17),
    updatedAt: daysAgo(12),
  },

  // ── Priya Sharma: cart with quantity > 1 items ────────────────────────────
  // Tests: increment/decrement quantity controls, cart total calculation
  {
    id: "user-priya-sharma-priya",
    userId: "user-priya-sharma-priya",
    items: [
      {
        itemId: "cartitem-priya-shirt-001",
        productId:
          "product-mens-cotton-casual-shirt-mens-fashion-new-fashion-boutique-1",
        productTitle: "Demon Slayer Tanjiro Kamado Graphic T-Shirt",
        productImage:
          "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=400&h=400&fit=crop",
        price: 1299,
        currency: "INR",
        quantity: 3, // buying 3 (as gifts)
        sellerId: "user-fashion-boutique-fashionb",
        sellerName: "AnimeCraft Apparel",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
      {
        itemId: "cartitem-priya-charger-001",
        productId: "product-anker-usbc-charger-electronics-new-techhub-1",
        productTitle: "Spirited Away No-Face Resin Miniature Twin Pack",
        productImage:
          "https://images.unsplash.com/photo-1591209733349-e1b6e42f4e97?w=400&h=400&fit=crop",
        price: 1290,
        currency: "INR",
        quantity: 1,
        sellerId: "user-techhub-electronics-electron",
        sellerName: "FigureVault JP",
        isAuction: false,
        isPreOrder: false,
        addedAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
    ],
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },

  // ── Raj Patel: empty cart (all items removed) ─────────────────────────────
  // Tests: empty cart UI state, "Your cart is empty" message,
  //        add-to-cart starting from empty state
  {
    id: "user-raj-patel-rajpatel",
    userId: "user-raj-patel-rajpatel",
    items: [],
    createdAt: daysAgo(27),
    updatedAt: daysAgo(9),
  },
];
