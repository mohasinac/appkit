/*
 * WHY: `AdminSiteSettingsView` is 1826 lines with **21 `<Form>` tags and no
 *      schema on any of them**. All 21 are tabs over one document and save
 *      through a single `buildFullPayload()` → one PUT, so this is one form
 *      wearing twenty-one hats, entirely unvalidated.
 *
 *      Live consequences already documented for this exact payload:
 *        · `announcementBar` was saved under the key `text` until 2026-08-24 —
 *          a key no renderer has ever read — so admin-authored announcements
 *          saved successfully and never appeared.
 *        · `adSettings`, `integrations`, `platformLimits`, `tagline` and
 *          `favicon` were written here while undeclared on
 *          `SiteSettingsDocument`, which is how an unmasked ad-credentials
 *          blob reached anonymous callers (Recurrent Root Cause #70).
 *
 * WHAT: A schema that validates the fields with real rules and **passes the
 *       rest through untouched**.
 *
 * ## 🛑 This one is `.passthrough()`, deliberately, and that is the whole point
 *
 * Everywhere else in this rework an update schema is `.strict()`. Here that
 * would be actively dangerous. `buildFullPayload()` demonstrably writes keys
 * the TypeScript interface does not declare, and a closed schema would SILENTLY
 * STRIP every one of them on the next save — turning a validation improvement
 * into the largest single act of data loss in the codebase. That is the
 * `productBaseSchema` failure, aimed at the site's entire configuration.
 *
 * So: constrain what can be reasoned about (percentages that must be 0–100,
 * money that must be non-negative, a contact email that must be an email), and
 * let the rest pass. Tightening any group is a separate, evidence-led change —
 * per the data-integrity protocol, only after a full-collection round-trip
 * diff proves the schema is a superset of what is stored.
 *
 * EXPORTS: siteSettingsFormSchema, type SiteSettingsFormValues
 *
 * @tag domain:admin
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminSiteSettingsView
 * @tag sideEffects:none
 */

import { z } from "zod";

/** A percentage a human types into a settings box. */
const percent = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(100, `${label} cannot exceed 100%.`)
    .optional();

/** A non-negative rupee amount. */
const money = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .optional();

/** An optional email box — blank is allowed, malformed is not. */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("That doesn't look like an email address.")
  .optional()
  .or(z.literal(""));

/** An optional URL box — blank is allowed, malformed is not. */
const optionalUrl = z
  .string()
  .trim()
  .url("Enter a full URL, including https://.")
  .optional()
  .or(z.literal(""));

export const siteSettingsFormSchema = z
  .object({
    /*
     * 🛑 `message` is the canonical key. Naming it here is what stops the
     * `text` mistake recurring: a payload carrying `text` still passes (the
     * schema is open), but the one key a renderer reads is now declared, and
     * the form is typed against it.
     */
    announcementBar: z
      .object({
        message: z.string().trim().max(300, "Keep the announcement under 300 characters.").optional(),
        enabled: z.boolean().optional(),
        link: optionalUrl,
      })
      .passthrough()
      .optional(),

    contact: z
      .object({
        email: optionalEmail,
        supportEmail: optionalEmail,
        phone: z.string().trim().max(40).optional(),
      })
      .passthrough()
      .optional(),

    /*
     * The commission block. Every one of these is a percentage or an amount
     * that multiplies against real orders, and all were free text — a stray
     * keystroke in `platformFeePercent` changes what every seller is charged.
     */
    commissions: z
      .object({
        platformFeePercent: percent("Platform fee"),
        gatewayFeePercent: percent("Gateway fee"),
        platformFeeMax: money("Platform fee cap"),
        minPayoutAmount: money("Minimum payout"),
        payoutHoldDays: z.coerce.number().int().min(0).max(365).optional(),
        codHandlingFee: money("COD handling fee"),
        codDepositPercent: percent("COD deposit"),
      })
      .passthrough()
      .optional(),

    laborRate: z
      .object({ hourlyRate: money("Hourly rate") })
      .passthrough()
      .optional(),

    emi: z
      .object({
        surchargePercent: percent("EMI surcharge"),
        surchargeSellerSharePercent: percent("Seller share"),
        minOrderAmount: money("Minimum EMI order"),
      })
      .passthrough()
      .optional(),

    gst: z
      .object({
        // 15 characters, the statutory format. A wrong GSTIN appears on every
        // invoice the platform issues.
        gstin: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z\d]$/, "That is not a valid 15-character GSTIN.")
          .optional()
          .or(z.literal("")),
        ratePercent: percent("GST rate"),
      })
      .passthrough()
      .optional(),

    auctionConfig: z
      .object({
        minBidIncrement: money("Minimum bid increment"),
        extensionMinutes: z.coerce.number().int().min(0).max(1440).optional(),
      })
      .passthrough()
      .optional(),

    seo: z
      .object({
        title: z.string().trim().max(70, "Search engines truncate titles past ~70 characters.").optional(),
        description: z
          .string()
          .trim()
          .max(160, "Search engines truncate descriptions past ~160 characters.")
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  // See the header: OPEN on purpose. `buildFullPayload()` writes keys the
  // document interface does not declare, and closing this would delete them.
  .passthrough();

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;
