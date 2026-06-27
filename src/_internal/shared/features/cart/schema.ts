import { z } from "zod";

const cartItemBaseSchema = z.object({
  productId: z.string().min(1),
  productTitle: z.string(),
  productImage: z.string().default(""),
  price: z.number().int().min(0),
  currency: z.string().default("INR"),
  storeId: z.string(),
  storeName: z.string().default(""),
  quantity: z.number().int().min(1).max(99).default(1),
  // SB1-G Phase 4 — canonical listing-kind snapshot.
  // SB-UNI-D — "bundle" removed from the listing-kind enum.
  listingType: z.enum([
    "standard",
    "auction",
    "pre-order",
    "prize-draw",
    "classified",
    "digital-code",
    "live",
  ]),
  isOffer: z.boolean().optional(),
  offerId: z.string().optional(),
  lockedPrice: z.number().int().optional(),
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

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type MergeGuestCartInput = z.infer<typeof mergeGuestCartSchema>;
