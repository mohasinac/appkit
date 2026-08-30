export * from "./firestore";
export * from "./address-form";

// ─── Firestore document schema (W2) ───────────────────────────────────────────
// Mirrors AddressDocument in ./firestore.ts. Registered into SCHEMAS.firestore.addresses.

import { z } from "zod";
import { auditTimestampsShape } from "../../../schemas/firestore-helpers";

export const addressOwnerTypeSchema = z.enum(["user", "store"]);

/*
 * The stored DOCUMENT, not a form. It carries `id`, `ownerType`, `ownerId` and
 * the audit timestamps that no form collects, and it is what
 * `SCHEMAS.firestore.addresses` validates a read against — a different job
 * from `addressFormSchema`, which validates what a human typed.
 */
// audit-address-shape-ok: the Firestore document mirror, registered in SCHEMAS.firestore
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
