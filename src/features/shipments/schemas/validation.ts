import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";
import { MAX_ITEMS_PER_LOT } from "./firestore";

export const shipmentStatusSchema = z.enum([
  "planning",
  "ordered",
  "in_transit",
  "customs",
  "received",
  "processing",
  "completed",
  "cancelled",
]);

const productConditionSchema = z.enum([
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
  "used",
  "refurbished",
  "broken",
  "graded",
]);

// Mirrors ProductDocument's ListingType union (products/types/index.ts) — the
// linked-product type a main item can be turned into via the link route.
const listingTypeSchema = z.enum([
  "standard",
  "auction",
  "pre-order",
  "prize-draw",
  "classified",
  "digital-code",
  "live",
  "art",
  "stickers",
]);

export const createShipmentSchema = z.object({
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  supplierName: z.string().min(1, "Supplier name is required"),
  originCountry: z.string().optional(),
  status: shipmentStatusSchema,
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  etaDate: z.union([z.string(), z.date()]).optional(),
  receivedDate: z.union([z.string(), z.date()]).optional(),
  notes: z.string().optional(),
  customsTotalPaise: z.number().int().min(0),
  shippingTotalPaise: z.number().int().min(0),
  laborHoursSpent: z.number().min(0).optional(),
  laborRatePaisePerHour: z.number().int().min(0).optional(),
});
export const updateShipmentSchema = createShipmentSchema.partial();

export const createShipmentLotSchema = z.object({
  lotName: z.string().min(1, "Lot name is required"),
  supplierOrderRef: z.string().optional(),
  weightGrams: z.number().min(0),
  purchaseCostPaise: z.number().int().min(0),
  images: z.array(mediaFieldSchema).optional().default([]),
  remainderItemCount: z.number().int().min(0).optional(),
  remainderEstimatedValuePaise: z.number().int().min(0).optional(),
});
export const updateShipmentLotSchema = createShipmentLotSchema.partial();

const shipmentItemBaseSchema = z.object({
  title: z.string().min(1, "Item title is required"),
  quantity: z.number().int().min(1),
  isForSelfUse: z.boolean(),
  price: z.number().int().min(0).optional(),
  condition: productConditionSchema.optional(),
  categorySlugs: z.array(z.string()).optional(),
  brandSlug: z.string().optional(),
  notes: z.string().optional(),
});

export const createShipmentItemSchema = shipmentItemBaseSchema.refine(
  (item) => item.isForSelfUse || typeof item.price === "number",
  { message: "Projected sale price is required unless the item is for self use", path: ["price"] },
);
export const updateShipmentItemSchema = shipmentItemBaseSchema.partial().extend({
  // Link/unlink fields — written by the link route and by the unlink action
  // (PATCH with `null` to clear). Not part of item creation, so kept out of
  // shipmentItemBaseSchema and declared nullable here rather than merely
  // optional, since Zod strips unknown keys and silently drops any field the
  // schema doesn't declare — omitting these here would make "unlink" a no-op.
  linkedProductId: z.string().nullable().optional(),
  linkedProductSlug: z.string().nullable().optional(),
  linkedProductListingType: listingTypeSchema.nullable().optional(),
});

/**
 * Bulk paste-import payload — capped at MAX_ITEMS_PER_LOT (500), matching
 * Firestore's native batched-write limit so the route can write the whole
 * import in one WriteBatch with no chunking logic.
 */
export const bulkShipmentItemsSchema = z
  .array(shipmentItemBaseSchema)
  .min(1, "Add at least one item")
  .max(MAX_ITEMS_PER_LOT, `A single import cannot exceed ${MAX_ITEMS_PER_LOT} items`)
  .refine((items) => items.every((item) => item.isForSelfUse || typeof item.price === "number"), {
    message: "Every row needs a projected sale price unless marked self-use",
  });

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type CreateShipmentLotInput = z.infer<typeof createShipmentLotSchema>;
export type UpdateShipmentLotInput = z.infer<typeof updateShipmentLotSchema>;
export type CreateShipmentItemInput = z.infer<typeof createShipmentItemSchema>;
export type UpdateShipmentItemInput = z.infer<typeof updateShipmentItemSchema>;
export type BulkShipmentItemsInput = z.infer<typeof bulkShipmentItemsSchema>;
