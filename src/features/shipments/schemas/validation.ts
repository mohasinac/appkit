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

/**
 * The four fields the add-item form actually offers, annotated for
 * `buildSectionsFromSchema`.
 *
 * 🛑 A separate object rather than `shipmentItemBaseSchema.pick(...)`, for two
 * reasons. `.pick()` returns NEW field instances and the annotation registry is
 * a WeakMap keyed by instance, so the meta would not survive. And deriving the
 * form from the full base schema would render `categorySlugs` (an array) and
 * `condition` as controls the add-item row has never had — an array has no
 * `FieldKind`, so it would appear as a disabled placeholder telling the user to
 * supply a renderer.
 *
 * The base schema stays the API contract; this is the form's subset of it.
 */
export const shipmentItemFormSchema = z
  .object({
    title: annotate(z.string().min(1, "Item title is required"), {
      section: "item", sectionLabel: "Add item", sectionRequired: true,
      order: 1, row: "pair", label: "Title",
    }),
    quantity: annotate(z.coerce.number().int().min(1, "At least one"), {
      section: "item", order: 2, row: "quarter", kind: "number", label: "Quantity",
    }),
    isForSelfUse: annotate(z.boolean(), {
      section: "item", order: 3, row: "quarter", kind: "toggle",
      label: "For self use (no resale)",
    }),
    /*
     * Hidden — not disabled — when the item is for self use. A self-use item has
     * no projected sale price by definition, and `visibleValues()` then drops
     * the value so a price typed before ticking the box cannot be submitted.
     */
    price: annotate(z.coerce.number().min(0).optional(), {
      section: "item", order: 4, row: "pair", kind: "number",
      label: "Projected sale price (₹)",
      when: (v) => !(v as { isForSelfUse?: boolean }).isForSelfUse,
    }),
  })
  .superRefine((item, ctx) => {
    // Mirrors `createShipmentItemSchema`'s refine. `when` hides the control; it
    // does NOT relax the rule, so the rule has to tolerate the hidden case.
    if (!item.isForSelfUse && typeof item.price !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Projected sale price is required unless the item is for self use",
      });
    }
  });

export type ShipmentItemFormValues = z.infer<typeof shipmentItemFormSchema>;
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
