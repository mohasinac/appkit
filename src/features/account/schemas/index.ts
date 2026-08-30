export * from "./firestore";

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

// --- Sub-schemas --------------------------------------------------------------

/*
 * `userAddressSchema` is DELETED (W5 / D19).
 *
 * It carried the `line1`/`line2` naming — one of the eleven address shapes,
 * and the only one that disagreed with `AddressDocument` on field NAMES rather
 * than just on rules. Zero consumers outside the barrel that re-exported it.
 * The one shape is `addressFormSchema` in
 * `features/addresses/schemas/address-form.ts`.
 */
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
  notificationPreferences: notificationPreferencesSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Client-side mirror of the server's updateProfileSchema
 * (src/app/api/user/profile/route.ts) — kept field-for-field in sync so a
 * value that passes client validation is guaranteed to pass server
 * validation too.
 */
export const updateProfileSchema = z.object({
  displayName: annotate(z.string().min(1, "Enter your name").optional(), {
    section: "profile", sectionLabel: "Your details", sectionRequired: true,
    quick: true, order: 1, row: "pair", label: "Display name",
  }),
  phoneNumber: annotate(z.string().optional(), {
    section: "profile", quick: true, order: 2, row: "pair",
    label: "Phone number", inputType: "tel",
  }),
  bio: annotate(
    z.string().max(500, "Bio must be 500 characters or fewer").optional(),
    {
      section: "profile", order: 3, row: "full", kind: "textarea",
      label: "Bio", help: "Up to 500 characters. Buyers see this on your public profile.",
    },
  ),
  profileIsPublic: annotate(z.boolean().optional(), {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "full",
    label: "Public profile",
    help: "When on, your profile is visible to other LetItRip users.",
  }),
});

/**
 * Changing the account email.
 *
 * Both fields were bare `<Input required>` on `/user/settings` — an HTML
 * attribute any programmatic submit bypasses — on a form that changes the
 * address every future sign-in and password reset goes to.
 *
 * The current password is required because re-authentication is what stops a
 * stolen session cookie from redirecting an account to an attacker's inbox;
 * the length floor is deliberately low, since it is checked against a stored
 * credential, not chosen here.
 */
export const changeEmailSchema = z.object({
  newEmail: annotate(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Enter the new email address.")
      .email("That doesn't look like an email address."),
    {
      section: "basics", sectionLabel: "Change email", sectionRequired: true,
      order: 1, row: "full", label: "New email address", inputType: "email",
    },
  ),
  /*
   * 🛑 `inputType: "password"` is not cosmetic. Without it the generated
   * control is a bare `<FieldInput>` with no `type`, which renders a password
   * IN PLAINTEXT — the defect found the first time this generator met a
   * credential field.
   */
  emailPassword: annotate(
    z.string().min(1, "Enter your current password to confirm."),
    {
      section: "basics", order: 2, row: "full", label: "Current password",
      inputType: "password",
    },
  ),
});

export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;
