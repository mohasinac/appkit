export * from "./firestore";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors AddressDocument in ./firestore.ts. Registered into SCHEMAS.firestore.addresses.

import { z } from "zod";
import { auditTimestampsShape } from "../../../schemas/firestore-helpers";

export const addressOwnerTypeSchema = z.enum(["user", "store"]);

export const addressFirestoreSchema = z.object({
  id: z.string(),
  ownerType: addressOwnerTypeSchema,
  ownerId: z.string(),
  label: z.string(),
  fullName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
  isDefault: z.boolean(),
  ...auditTimestampsShape,
});

export type AddressFromSchema = z.infer<typeof addressFirestoreSchema>;
