import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
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
  shipmentNumber: annotate(z.string().min(1, "Shipment number is required"), {
    section: "basics", sectionLabel: "Shipment", sectionRequired: true,
    order: 1, row: "pair", label: "Shipment number",
  }),
  supplierName: annotate(z.string().min(1, "Supplier name is required"), {
    section: "basics", order: 2, row: "pair", label: "Supplier",
  }),
  originCountry: annotate(z.string().optional(), {
    section: "basics", order: 3, row: "pair", label: "Origin country",
  }),
  status: annotate(shipmentStatusSchema, {
    section: "basics", order: 4, row: "pair", kind: "select", label: "Status",
  }),
  trackingNumber: annotate(z.string().optional(), {
    section: "logistics", sectionLabel: "Tracking & dates",
    order: 1, row: "pair", label: "Tracking number",
  }),
  carrier: annotate(z.string().optional(), {
    section: "logistics", order: 2, row: "pair", label: "Carrier",
  }),
  etaDate: annotate(z.union([z.string(), z.date()]).optional(), {
    section: "logistics", order: 3, row: "pair", kind: "date", label: "ETA",
  }),
  receivedDate: annotate(z.union([z.string(), z.date()]).optional(), {
    section: "logistics", order: 4, row: "pair", kind: "date", label: "Received on",
  }),
  customsTotal: annotate(z.number().min(0), {
    section: "pricing", sectionLabel: "Landed cost",
    order: 1, row: "pair", kind: "number", label: "Customs total (₹)",
  }),
  shippingTotal: annotate(z.number().min(0), {
    section: "pricing", order: 2, row: "pair", kind: "number", label: "Shipping total (₹)",
  }),
  laborHoursSpent: annotate(z.number().min(0).optional(), {
    section: "pricing", order: 3, row: "pair", kind: "number", label: "Labour hours",
  }),
  laborRatePerHour: annotate(z.number().min(0).optional(), {
    section: "pricing", order: 4, row: "pair", kind: "number", label: "Labour rate (₹/hr)",
  }),
  notes: annotate(z.string().optional(), {
    section: "detail", sectionLabel: "Notes", order: 1, row: "full", kind: "textarea",
    label: "Notes",
  }),
});
export const updateShipmentSchema = createShipmentSchema.partial();

export const createShipmentLotSchema = z.object({
  lotName: z.string().min(1, "Lot name is required"),
  supplierOrderRef: z.string().optional(),
  weightGrams: z.number().min(0),
  purchaseCost: z.number().min(0),
  images: z.array(mediaFieldSchema).optional().default([]),
  remainderItemCount: z.number().int().min(0).optional(),
  remainderEstimatedValue: z.number().min(0).optional(),
});
export const updateShipmentLotSchema = createShipmentLotSchema.partial();

const shipmentItemBaseSchema = z.object({
  title: z.string().min(1, "Item title is required"),
  quantity: z.number().int().min(1),
  isForSelfUse: z.boolean(),
  price: z.number().min(0).optional(),
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
