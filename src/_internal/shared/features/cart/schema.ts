import { z } from "zod";

const cartItemBaseSchema = z.object({
  productId: z.string().min(1),
  productTitle: z.string(),
  productImage: z.string().default(""),
  price: z.number().min(0),
  currency: z.string().default("INR"),
  storeId: z.string(),
  storeName: z.string().default(""),
  quantity: z.number().int().min(1).max(99).default(1),
  // SB1-G Phase 4 — canonical listing-kind snapshot.
  // SB-UNI-D — "bundle" removed from the listing-kind enum.
  /*
   * All NINE listing types. `art` and `stickers` were missing until
   * 2026-08-24 (W3) — added to the union, the plugin registry, the capability
   * map and the Sieve alias map, but not here.
   *
   * Not a live bug today, and verified rather than assumed (Rule #4): the real
   * add-to-cart path is `POST /api/cart`, which takes only {productId,
   * quantity} and derives the type server-side via `normalizeListingType`,
   * never validating it against an enum. This enum sits on paths an art or
   * sticker listing cannot currently reach. It was a trap waiting for the
   * first caller that did — the third instalment of Root Cause #58, where a
   * union member is added everywhere except the one allowlist that gates it.
   */
  listingType: z.enum([
    "standard",
    "auction",
    "pre-order",
    "prize-draw",
    "classified",
    "digital-code",
    "live",
    "art",
    "stickers",
  ]),
  isOffer: z.boolean().optional(),
  offerId: z.string().optional(),
  lockedPrice: z.number().optional(),
});

export const addToCartSchema = cartItemBaseSchema;

export const updateCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const removeFromCartSchema = z.object({
  productId: z.string().min(1),
});

export const mergeGuestCartSchema = z.object({
  guestItems: z.array(cartItemBaseSchema),
});

/**
 * Renamed from `AddToCartInput` 2026-08-24 (W3) — `features/cart/schemas/
 * firestore.ts` declares its own hand-written `AddToCartInput`, and a consumer
 * importing the name had no way to tell which one it got.
 */
export type AddToCartActionInput = z.infer<typeof addToCartSchema>;
export type MergeGuestCartInput = z.infer<typeof mergeGuestCartSchema>;
