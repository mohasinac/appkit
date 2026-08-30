/*
 * WHY: There were **eleven** address field shapes in the tree and three
 *      separate naming schisms across them — `postalCode` vs `pincode`,
 *      `phone` vs `phoneNumber`, `addressLine1` vs `line1` — plus **fifteen**
 *      postal rules that disagreed with each other, two of them server-side
 *      rules on the same entity. The client said `.min(1)` and the server said
 *      `/^\d{6}$/`, so `abc` passed every check the user could see and came
 *      back a 400 with nothing on the field.
 * WHAT: One address shape, one postal rule, used by every form and every
 *       route that writes an address.
 *
 * ## The shape is `AddressDocument`, not a new one
 *
 * `postalCode` / `phone` / `addressLine1` — the stored names win, because the
 * alternative is a mapping layer at every boundary and that is precisely how
 * eleven shapes happened.
 *
 * ## The postal rule is per COUNTRY, and that was the real defect
 *
 * `country` is free text, so an India-only `/^\d{6}$/` was being applied to
 * Canadian addresses. `isValidPostalCode` resolves the rule from the country
 * on the same record, and falls back to a permissive length bound when the
 * country is one we do not enumerate — an unknown country must never block a
 * save.
 *
 * EXPORTS:
 *   refineAddressPostal, addressFormSchema, addressUpdateSchema,
 *   adminAddressCreateSchema, adminAddressUpdateSchema, and their value types
 *
 * @tag domain:addresses
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AddressForm,AdminAddressEditorView,UserAddressesClient,address routes
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import {
  DEFAULT_COUNTRY,
  countryFor,
  isValidPostalCode,
  postalLabelFor,
} from "../../../constants/geo/countries";

/**
 * The ONE postal rule.
 *
 * Fifteen used to disagree — two of them server-side rules on the same
 * entity — and this is the only one now, shared by every form and every route
 * that writes an address.
 *
 * The message names what the country itself calls the field, so a Canadian
 * address is never told to enter a "PIN code". An unknown country falls back
 * to a length bound inside `isValidPostalCode`, because a postal rule exists
 * to catch a typo and must never block a save.
 */
export function refineAddressPostal(
  v: { postalCode?: string; country?: string },
  ctx: z.RefinementCtx,
): void {
  if (!v.postalCode) return;
  const country = v.country ?? DEFAULT_COUNTRY;
  if (isValidPostalCode(country, v.postalCode)) return;
  const known = countryFor(country);
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["postalCode"],
    message: known
      ? `That is not a valid ${postalLabelFor(country)} for ${known.name}.`
      : "That does not look like a postal code.",
  });
}

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const addressFormSchema = z
  .object({
    /*
     * Required, because `AddressDocument.label` is `string` and not
     * `string | undefined` — four of the six server schemas already had
     * `.min(1)` and the buyer form had it optional, which is one of the eleven
     * shapes this collapses.
     */
    label: annotate(z.string().trim().min(1, "Give the address a label.").max(60), {
      section: "address", sectionLabel: "Address", sectionRequired: true,
      quick: true, order: 1, row: "pair", label: "Label",
      help: "Home, Work, Warehouse — whatever helps you pick it at checkout.",
    }),
    fullName: annotate(
      z.string().trim().min(2, "Enter the recipient's full name.").max(120),
      {
        section: "address", quick: true, order: 2, row: "pair",
        label: "Full name",
      },
    ),
    /*
     * Digits, spaces and the usual separators, 7–15 long — E.164's own bound.
     * It was `.min(1)` on one surface and unchecked on two others, so a phone
     * number of "x" reached the courier.
     */
    phone: annotate(
      z
        .string()
        .trim()
        .regex(/^[+\d][\d\s\-()]{6,19}$/, "Enter a phone number the courier can call."),
      {
        section: "address", quick: true, order: 3, row: "pair",
        label: "Phone", inputType: "tel",
      },
    ),

    addressLine1: annotate(
      z.string().trim().min(3, "Enter the street address.").max(200),
      {
        section: "location", sectionLabel: "Where", sectionRequired: true,
        order: 1, row: "full", label: "Address line 1",
      },
    ),
    addressLine2: annotate(z.string().trim().max(200).optional().or(z.literal("")), {
      section: "location", order: 2, row: "full", label: "Address line 2",
    }),
    landmark: annotate(z.string().trim().max(120).optional().or(z.literal("")), {
      section: "location", order: 3, row: "pair", label: "Landmark",
    }),
    city: annotate(z.string().trim().min(2, "Enter the city.").max(120), {
      section: "location", order: 4, row: "pair", label: "City",
    }),
    /*
     * A picker where the country enumerates its subdivisions, free text where
     * it does not — the form decides that from `hasStates`. It was free text
     * on two surfaces and a 36-option `INDIAN_STATES` select on a third, all
     * writing the same field.
     */
    state: annotate(z.string().trim().min(2, "Enter the state or region.").max(120), {
      section: "location", order: 5, row: "pair", label: "State / region",
    }),
    /*
     * Only checked for emptiness HERE; the real rule is the country-aware one
     * in the `superRefine`, because a per-field rule cannot see `country`.
     */
    postalCode: annotate(z.string().trim().min(1, "Enter the postal code."), {
      section: "location", order: 6, row: "pair", label: "Postal code",
    }),
    country: annotate(z.string().trim().min(2, "Choose a country.").default(DEFAULT_COUNTRY), {
      section: "location", order: 7, row: "pair", kind: "select", label: "Country",
    }),

    /*
     * `.default(false)` rather than `.optional()`: `AddressDocument.isDefault`
     * is `boolean`, so a create that omits it has to mean "not default"
     * somewhere — and four of the six server schemas were supplying that
     * default themselves, each in its own way.
     */
    isDefault: annotate(z.boolean().default(false), {
      section: "visibility", sectionLabel: "Preferences", order: 1, row: "full",
      label: "Use as my default address",
    }),
  })
  .superRefine(refineAddressPostal);

export type AddressFormValues = z.infer<typeof addressFormSchema>;

/**
 * A partial update.
 *
 * `.partial()` on the inner object, then the same refinement — an edit that
 * changes only the label must not be told its postal code is missing, but an
 * edit that changes the postal code must still be checked against the country.
 */
export const addressUpdateSchema = addressFormSchema.innerType()
  .partial()
  .superRefine(refineAddressPostal);

export type AddressUpdateValues = z.infer<typeof addressUpdateSchema>;

/**
 * An address as an ADMIN writes it — the shared shape plus the owner it
 * belongs to, which only an admin may choose.
 *
 * Extended from the same base rather than restated. It was restated: the admin
 * route declared its own eleven fields with `postalCode: z.string().min(6).max(6)`
 * — a LENGTH check with no character class, so `"abcdef"` was a valid Indian
 * PIN code as far as that route was concerned.
 */
export const adminAddressCreateSchema = addressFormSchema.innerType()
  .extend({
    ownerType: z.enum(["user", "store"]),
    ownerId: z.string().trim().min(1, "Choose who this address belongs to."),
  })
  .superRefine(refineAddressPostal);

export const adminAddressUpdateSchema = adminAddressCreateSchema.innerType()
  .partial()
  .superRefine(refineAddressPostal);

export type AdminAddressCreateValues = z.infer<typeof adminAddressCreateSchema>;

/**
 * The admin PATCH body — an address edit OR a moderation verb.
 *
 * 🛑 Declared HERE rather than `.extend()`-ed at the route, because the
 * consumer is on zod 4 and appkit compiles against zod 3 (the two-zod split
 * documented in `field-ui-meta.ts`). Extending an appkit schema with
 * consumer-side `z` produces a type error at best and two incompatible
 * validator instances at worst.
 *
 * `action` and `banReason` are not address FIELDS — an admin banning an
 * address is not editing it — which is why they sit alongside the shape
 * rather than inside it.
 */
export const adminAddressPatchSchema = adminAddressCreateSchema.innerType()
  .partial()
  .extend({
    action: z.enum(["ban", "approve_unban", "reject_unban"]).optional(),
    banReason: z.string().trim().max(500).optional(),
  })
  .superRefine(refineAddressPostal);

export type AdminAddressPatchValues = z.infer<typeof adminAddressPatchSchema>;

/**
 * A buyer's request that a banned address be restored.
 *
 * 🛑 Lives in appkit, not beside its drawer in the consumer: appkit compiles
 * against zod 3 and the app is on zod 4, so a consumer-built schema handed to
 * `useFormShellState` is a type error and two incompatible validator
 * instances. Every schema a form primitive parses has to be declared on this
 * side of that split.
 *
 * A floor of 20 characters, higher than the 10 an admin ban REASON carries.
 * The asymmetry is deliberate: a ban is written by staff who also have the
 * audit log and the flagged order in front of them, while this note is the
 * only thing a reviewer has. "please unban" costs them a round trip.
 */
export const addressUnbanRequestSchema = z.object({
  note: z
    .string()
    .trim()
    .min(20, "Explain what happened — at least 20 characters. This is all the reviewer sees.")
    .max(1000, "Keep it under 1000 characters."),
});

export type AddressUnbanRequestValues = z.infer<typeof addressUnbanRequestSchema>;
