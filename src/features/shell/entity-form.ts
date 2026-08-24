import type { JsonValue } from "@mohasinac/appkit/client";
import type { ZodTypeAny } from "zod";
import type { SectionDef } from "./SectionForm";
import type { QuickFieldDef, QuickFieldType } from "./QuickFormDrawer";

/**
 * One definition per entity, two rendered modes.
 *
 * The point of this type is that quick mode is DERIVED from `sections`, never
 * declared alongside them — two hand-maintained field lists for one entity is
 * the drift this codebase already has too much of.
 *
 * ## Quick mode is self-submitting
 *
 * Saving from the quick drawer must produce a complete, valid, publishable
 * record. It is not step one of the full form; "open full form" is an optional
 * secondary path. That gives a mechanical rule for what belongs in it:
 *
 *     quickFields = schema.required − derive()'s outputs
 *
 * If the resulting `quickSchema` cannot satisfy the server's create schema,
 * the definition is wrong — the missing field either joins the quick set or
 * gets a `derive()` default. Nothing may be left "for the user to finish
 * later": that is exactly how `/store/products/new` came to POST without a
 * `listingType` at all.
 */
export interface EntityFormDefinition<T extends object = Record<string, JsonValue>> {
  /** Stable key — also the `SCHEMAS.forms` registry key. */
  entity: string;
  /** Full-mode schema. Satisfies `audit-form-schema`. */
  schema: ZodTypeAny;
  /**
   * Create-mode schema for the quick drawer. Defaults to `schema` when
   * omitted, but should normally be `schema.pick(quickFields)`.
   *
   * CREATE ONLY. A quick schema is a strict subset by construction, so
   * sending it to a PATCH would strip every field outside the quick set.
   */
  quickSchema?: ZodTypeAny;
  /** THE single source of truth for this entity's fields. */
  sections: SectionDef<T>[];
  /**
   * Auto-compute fields from earlier ones — slug and SEO from a title, totals
   * from line items, counts from an array.
   *
   * Two rules, both enforced rather than documented:
   *  - a `derive()` output may NEVER also be a quick field (asserted by
   *    `assertNoDeriveCollision`) — that would ask the user for something the
   *    definition already computes;
   *  - it must fill only when the target is empty or its source actually
   *    changed, never overwrite a value the user typed.
   */
  derive?: (partial: Partial<T>, prev: T, ctx: { mode: "create" | "edit" }) => Partial<T>;
  /** Field names `derive` can produce. Used to subtract them from the quick set. */
  derivedFields?: readonly string[];
  /** Input types for quick-mode fields. Anything absent defaults to `"text"`. */
  quickFieldTypes?: Readonly<Record<string, QuickFieldType>>;
  /** Labels for quick-mode fields. Falls back to a humanised field name. */
  quickFieldLabels?: Readonly<Record<string, string>>;
  /** Field names that are required in quick mode (drives the `required` flag). */
  requiredFields?: readonly string[];
  routes: {
    list: string;
    new: string;
    edit: (id: string) => string;
    view?: (id: string) => string;
  };
  labels: { singular: string; plural: string };
}

/** `"storeName"` / `"store_name"` / `"store.name"` -> `"Store name"`. */
export function humaniseFieldName(name: string): string {
  const leaf = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : name;
  const spaced = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The quick-mode field set: every field owned by a `quick: true` section,
 * minus anything `derive()` produces.
 *
 * Derived, never declared — so quick and full modes cannot drift apart.
 */
export function deriveQuickFieldNames<T extends object>(
  def: EntityFormDefinition<T>,
): string[] {
  const derived = new Set(def.derivedFields ?? []);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const section of def.sections) {
    if (!section.quick) continue;
    for (const field of section.fields ?? []) {
      if (derived.has(field) || seen.has(field)) continue;
      seen.add(field);
      out.push(field);
    }
  }
  return out;
}

/** Quick-mode field descriptors — feed straight into QuickFormDrawer's `fields` prop. */
export function deriveQuickFields<T extends object>(
  def: EntityFormDefinition<T>,
): QuickFieldDef[] {
  const required = new Set(def.requiredFields ?? []);
  return deriveQuickFieldNames(def).map((name) => ({
    name,
    label: def.quickFieldLabels?.[name] ?? humaniseFieldName(name),
    type: def.quickFieldTypes?.[name] ?? "text",
    required: required.has(name),
  }));
}

/**
 * Throws when a `derive()` output is also offered as a quick field.
 *
 * That combination means the form asks the user to type something the
 * definition computes for them, and whichever runs last silently wins. Call
 * this once per definition — it is cheap and catches the mistake at the point
 * the definition is written rather than at the point data is lost.
 */
export function assertNoDeriveCollision<T extends object>(
  def: EntityFormDefinition<T>,
): void {
  const derived = new Set(def.derivedFields ?? []);
  if (derived.size === 0) return;
  const collisions: string[] = [];
  for (const section of def.sections) {
    if (!section.quick) continue;
    for (const field of section.fields ?? []) {
      if (derived.has(field)) collisions.push(field);
    }
  }
  if (collisions.length > 0) {
    throw new Error(
      `EntityFormDefinition("${def.entity}"): ${collisions.join(", ")} ` +
        `${collisions.length === 1 ? "is" : "are"} produced by derive() and also ` +
        `marked as quick field(s). A derived field must not be asked of the user — ` +
        `drop it from the quick section's \`fields\`, or stop deriving it.`,
    );
  }
}

/**
 * Every field name the definition can reach — the union of all section fields
 * plus everything `derive()` produces.
 *
 * This is what a schema must be a superset of. A document field missing from
 * this set is unreachable in the UI; a schema field missing from it can never
 * be populated. `audit-form-field-roundtrip` checks both directions.
 */
export function allDefinitionFields<T extends object>(
  def: EntityFormDefinition<T>,
): string[] {
  const out = new Set<string>(def.derivedFields ?? []);
  for (const section of def.sections) {
    for (const field of section.fields ?? []) out.add(field);
  }
  return [...out];
}

/**
 * Apply `derive()` to a pending change, without clobbering user input.
 *
 * Returns the partial to merge: the caller's own change plus whatever the
 * definition computed from it.
 */
export function applyDerive<T extends object>(
  def: EntityFormDefinition<T>,
  partial: Partial<T>,
  prev: T,
  mode: "create" | "edit",
): Partial<T> {
  if (!def.derive) return partial;
  return { ...partial, ...def.derive(partial, prev, { mode }) };
}
