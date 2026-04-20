export * from "./firestore";

import { z } from "zod";

// --- Sub-schemas --------------------------------------------------------------

export const userAddressSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
  isDefault: z.boolean().optional(),
  phone: z.string().optional(),
});

export const notificationPreferencesSchema = z.object({
  orderUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
});

// --- Base profile schema ------------------------------------------------------

/**
 * Base Zod schema for a user profile.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { userProfileSchema } from "@mohasinac/feat-account";
 *
 * const mySchema = userProfileSchema.extend({
 *   loyaltyTier: z.enum(["bronze", "silver", "gold"]).optional(),
 * });
 */
export const userProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  photoURL: z.string().optional(),
  bio: z.string().optional(),
  addresses: z.array(userAddressSchema).optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});
