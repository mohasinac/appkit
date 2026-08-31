/*
 * WHY: `AdminSectionsView` rendered a `<Form>` with no `schema` prop. The route
 *      validated `order` / `enabled` / `config`, so nothing invalid was ever
 *      stored — but a bad value came back as a 400 banner after a round-trip
 *      rather than as an error on the field that caused it.
 * WHAT: The homepage-section form schema.
 *
 * ## `config` stays open, deliberately
 *
 * Its shape differs per section type across 21 types, and the route models it
 * the same way (`z.object({}).passthrough()`). Naming a fixed shape here would
 * strip whatever the current type actually needs — the exact defect that made
 * `productBaseSchema` eat every per-type listing field. The form parses it as
 * JSON and reports malformed input; the per-type meaning stays with the
 * section renderer that owns it.
 *
 * EXPORTS:
 *   homepageSectionFormSchema, type HomepageSectionFormValues
 *
 * @tag domain:admin,homepage
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminSectionsView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { normalizeError } from "../../../errors/normalize";

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const homepageSectionFormSchema = z.object({
  sectionType: annotate(z.string().min(1, "Choose a section type."), {
    section: "basics", sectionLabel: "Section", sectionRequired: true,
    quick: true, order: 1, row: "pair",
  }),
  order: annotate(
    z.coerce
      .number({ invalid_type_error: "Order must be a number." })
      .int("Order must be a whole number.")
      .min(0, "Order cannot be negative.")
      .optional(),
    { section: "basics", order: 2, row: "pair" },
  ),
  enabled: annotate(z.boolean(), {
    section: "basics", order: 3, row: "quarter",
  }),
  configJson: annotate(
    z.string().refine(isParsableJson, { message: "Config must be valid JSON." }),
    {
      section: "config", sectionLabel: "Configuration",
      order: 1, row: "full", kind: "list",
    },
  ),
});

/** Hoisted so the `annotate()` call above stays a simple two-argument call. */
function isParsableJson(value: string): boolean {
  if (!value.trim()) return true;
  try {
    JSON.parse(value);
    return true;
  } catch (_err) {
    // Normalized rather than suppressed. The parse failure IS the return value
    // here — `false` answers the only question this asks — but the project
    // forbids adding new suppression markers, and this is the same shape
    // AdminSectionsView already uses for the very same JSON parse.
    void normalizeError(_err);
    return false;
  }
}

export type HomepageSectionFormValues = z.infer<typeof homepageSectionFormSchema>;

/**
 * What the FORM holds, as distinct from what the schema produces.
 *
 * `order` is a `z.coerce.number()`, so the parsed value is a number while the
 * control that feeds it is a text input holding a string — including the empty
 * string, which means "auto-place". The draft is the INPUT side; only the save
 * path sees the output.
 */
export type HomepageSectionFormInput = z.input<typeof homepageSectionFormSchema>;
