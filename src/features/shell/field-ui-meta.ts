/*
 * WHY: Which section a field belongs to, and whether it shares a row with its
 *      neighbour, were conventions written in a table in a plan document. A
 *      convention drifts; 70 bare `grid-cols-2` in the tree — each one two
 *      columns wide at 320px — are what that drift looks like. Zod 4 lets the
 *      rule live on the field it describes, so the schema becomes the single
 *      source of validation, section membership AND layout.
 * WHAT: `FieldUiMeta`, the typed `ui` registry, and `inferFieldUiMeta` — the
 *       heuristic that means only `section` has to be stated per field.
 *
 * ## 🛑 There are TWO zods in this repo, and that decided the design
 *
 * Measured 2026-08-24: the app depends on **zod 4.4.3**, but `appkit`'s own
 * `package.json` declares `zod: ^3.24.0` and a v3 copy is nested at
 * `node_modules/@mohasinac/appkit/node_modules/zod` (3.25.76). Verified with
 * `createRequire`: appkit's shipped `dist` resolves `"zod"` to that nested v3,
 * while consumer code resolves to root v4. Two instances, one bundle — the
 * Root Cause #19 shape, on a package the dedupe script does not cover.
 *
 * So `z.registry<FieldUiMeta>()` is **not usable here**: it is a zod-4 API and
 * appkit compiles against v3. Aligning the two is a dependency major across
 * the 76 appkit files that import zod — its own wave, not a drive-by inside a
 * spine wave.
 *
 * This registry is therefore a plain `WeakMap` keyed by schema instance, which
 * is what `z.registry()` is internally. It behaves identically, works on both
 * majors, and is strictly MORE robust to the split: object identity does not
 * care which zod class produced the object. `annotate()` is typed, so a typo
 * (`rows:` for `row:`) is a compile error — the property `.meta()` never had.
 *
 * Everything that introspects a schema below reads BOTH shapes for the same
 * reason: zod 3 says `_def.typeName === "ZodOptional"`, zod 4 says
 * `_def.type === "optional"`, and this file sees both at runtime.
 *
 * ## 🛑 The ordering trap — metadata MUST be the last call in the chain
 *
 * Verified at runtime:
 *
 *     annotate(z.string(), {...}).optional()   // ✗ meta LOST → lookup undefined
 *     annotate(z.string().optional(), {...})   // ✓ survives
 *
 * Every wrapper (`.optional()`, `.nullable()`, `.default()`, `.catch()`)
 * returns a NEW schema instance, and the registry is keyed by instance. Most
 * fields are optional, so getting this backwards silently drops layout for the
 * majority of them. `audit-field-ui-meta` enforces the ordering.
 *
 * EXPORTS:
 *   FieldUiMeta, FieldRow, FieldKind, CalculatedTier, ui, annotate,
 *   inferFieldUiMeta, resolveFieldUiMeta, unwrapSchema, ROW_COLUMNS
 *
 * @tag domain:forms
 * @tag layer:shared
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:buildSectionsFromSchema,audit-field-ui-meta
 * @tag sideEffects:none
 */

import type { FormSectionGroup } from "./form-sections";
import type { ZodTypeAny } from "zod";
import type { FormValues } from "../../schemas/types";

/** How much of a row a field claims on desktop. Everything is 1-up on mobile. */
export type FieldRow = "full" | "pair" | "third" | "quarter";

/** Which input primitive renders the field, and its default row span. */
export type FieldKind =
  | "text"
  | "number"
  | "date"
  | "select"
  | "toggle"
  | "textarea"
  | "media"
  | "list";

/**
 * Which tier owns a value that is not typed by the user.
 * T1 client `derive()` · T2 server-on-write · T3 mirror · T4 background job.
 * The tier decides the correctness rule — see the calculated-field dictionary.
 */
export type CalculatedTier = "t1-derive" | "t2-server" | "t3-mirror" | "t4-aggregate";

export interface FieldUiMeta {
  /**
   * Section id this field belongs to — the grouping key, and the ONE key that
   * cannot be inferred. Whether `gstin` belongs under "Tax" or "Business
   * details" is a product decision, and a wrong section renders perfectly
   * fine in the wrong place with nothing failing. Deliberately NOT inferred
   * from a name prefix (`billing_city` → "billing"): that would work for a
   * handful of schemas and quietly mis-group the rest.
   */
  section: string;
  /**
   * Priority band this section belongs to — drives ORDER and default-open,
   * never identity.
   *
   * Deliberately separate from `section`, which stays free-form. Collapsing the
   * 58 section ids in use onto a closed 12-value set was measured first and
   * would have MERGED sections in 7 files: the scam report's `who` + `what` +
   * `declare` into one blob, coupons' `limits` + `validity`, blog's `content` +
   * `seo`. The id is the rendered unit and supplies the visible heading (144 of
   * 228 annotations have no `sectionLabel`, so `humaniseFieldName(id)` IS their
   * heading); the group is only "how early does this appear".
   *
   * Omit it and `SECTION_GROUP_DEFAULTS` resolves one from the id. A brand-new
   * id with no default must declare its own.
   */
  group?: FormSectionGroup;
  /** Human label for the section. The first field to declare it wins. */
  sectionLabel?: string;
  /** Marks its section required-first, open on mount, non-collapsible. */
  sectionRequired?: boolean;
  /**
   * Section keeps its panel mounted while collapsed. Mandatory for any
   * section holding uncommitted state — `<Collapse>` unmounts its children,
   * which discards an in-flight media upload.
   */
  sectionKeepMounted?: boolean;

  /**
   * Render this field only when the predicate holds.
   *
   * `SectionDef` has had a section-level `when` since W0; this is the
   * per-FIELD equivalent, and without it a whole class of form cannot be
   * derived at all — a shipping config shows "Price per kg" for a flat rate,
   * a payment method shows bank fields for a UPI account. Those pages were
   * stuck hand-writing their fields.
   *
   * A predicate is a UI concern living on a schema that the ROUTE also parses.
   * That is already true of every key here (`section`, `row`, `kind`), and the
   * server ignores the registry entirely — annotations key a WeakMap, they are
   * not part of the parsed shape.
   *
   * 🛑 Hiding a field does NOT relax its schema. A required field hidden by
   * `when` still fails validation, invisibly. Pair it with `.optional()` plus
   * a `superRefine` that requires it under the same condition — the way
   * `supportTicketCreateSchema` handles `orderId` for `order_issue`.
   */
  when?: (values: FormValues) => boolean;

  /** Row span. Drives the `<FormGroup columns>` packing. */
  row?: FieldRow;
  /** Control kind. Picks the primitive and the default row span. */
  kind?: FieldKind;
  /** Sort order within the section. Unset sorts after ordered fields. */
  order?: number;

  /** Belongs in the self-submitting quick drawer. */
  quick?: boolean;
  /** Produced by `derive()` or the server — never rendered as a bare input. */
  derived?: boolean;
  /** Which calculated-field tier owns it, when it is not user-entered. */
  tier?: CalculatedTier;

  label?: string;
  help?: string;
  /**
   * The native `<input type>` for a `kind: "text"` field.
   *
   * `FieldKind` deliberately stays a small set of CONTROL kinds — it picks
   * which primitive renders, and `email`/`password`/`tel`/`url` all render the
   * same `<FieldInput>`. What they change is the browser's keyboard, autofill
   * and masking, which is a property of the field rather than of the control.
   *
   * 🛑 Without this the generator emits a bare `<FieldInput>` with no `type`,
   * so a password field renders **in plaintext**. Any schema with a password,
   * an email or a phone number must set it.
   */
  inputType?: "text" | "email" | "password" | "tel" | "url" | "search";
}

/**
 * The registry. A module-level singleton, because the whole point is that
 * every form schema in the app annotates into the same place and can be
 * queried as one ("every media field", "every quick field", "every field with
 * no section").
 *
 * `WeakMap` so annotating a schema never keeps it alive.
 */
const REGISTRY = new WeakMap<object, FieldUiMeta>();

export const ui = {
  /** Attach metadata to a schema instance. Returns the SAME instance. */
  add<S extends ZodTypeAny>(schema: S, meta: FieldUiMeta): S {
    REGISTRY.set(schema as unknown as object, meta);
    return schema;
  },
  get(schema: ZodTypeAny): FieldUiMeta | undefined {
    return REGISTRY.get(schema as unknown as object);
  },
  has(schema: ZodTypeAny): boolean {
    return REGISTRY.has(schema as unknown as object);
  },
};

/**
 * Annotate a field. **Must be the outermost call in the chain** — see the
 * ordering trap in the header.
 *
 *     name:  annotate(z.string().min(1),   { section: "basics", quick: true }),
 *     photo: annotate(z.string().optional(), { section: "media" }),
 *
 * Wrapping the call rather than chaining off it (`.register()`-style) is
 * deliberate: it puts the schema visually INSIDE the annotation, so appending
 * `.optional()` afterwards looks as wrong as it is.
 */
export function annotate<S extends ZodTypeAny>(schema: S, meta: FieldUiMeta): S {
  return ui.add(schema, meta);
}

/** `row` → the `<FormGroup columns>` value it packs into. */
export const ROW_COLUMNS: Record<FieldRow, 1 | 2 | 3 | 4> = {
  full: 1,
  pair: 2,
  third: 3,
  quarter: 4,
};

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

/**
 * Normalise a zod type discriminator across majors.
 * zod 3: `_def.typeName === "ZodOptional"` · zod 4: `_def.type === "optional"`.
 */
function typeOf(schema: ZodTypeAny): string {
  const def = (schema as unknown as { _def?: { type?: string; typeName?: string } })._def;
  if (def?.type) return def.type;                       // v4, already lowercase
  const name = def?.typeName;                            // v3, "ZodOptional"
  return name ? name.replace(/^Zod/, "").toLowerCase() : "";
}

/** Wrappers that produce a new instance around an inner type. */
const WRAPPERS = new Set(["optional", "nullable", "default", "catch", "readonly", "nonoptional"]);

/**
 * Strip `.optional()` / `.nullable()` / `.default()` / `.catch()` to reach the
 * type that actually decides the control. Returns the innermost schema and its
 * normalised type discriminator.
 *
 * Reads `_def` because zod exposes no public accessor for this, on either
 * major. Depth-bounded rather than trusting the shape: `_def` is internal, and
 * this must degrade to "text" rather than loop if a future zod reshapes it.
 */
export function unwrapSchema(schema: ZodTypeAny): { schema: ZodTypeAny; type: string } {
  let current: ZodTypeAny = schema;
  for (let depth = 0; depth < 10; depth++) {
    const def = (current as unknown as { _def?: { innerType?: ZodTypeAny } })._def;
    const type = typeOf(current);
    if (!WRAPPERS.has(type) || !def?.innerType) return { schema: current, type };
    current = def.innerType;
  }
  return { schema: current, type: "" };
}

/**
 * The `max()` bound on a string schema, when it declares one — the signal that
 * separates a text input from a textarea.
 *
 * The two majors store checks completely differently:
 *   v3: `_def.checks = [{ kind: "max", value: 300 }]`
 *   v4: `_def.checks = [{ _zod: { def: { check: "max_length", maximum: 300 } } }]`
 */
function stringMaxLength(schema: ZodTypeAny): number | undefined {
  const checks = (schema as unknown as { _def?: { checks?: unknown[] } })._def?.checks;
  if (!Array.isArray(checks)) return undefined;
  for (const check of checks) {
    const v4 = (check as { _zod?: { def?: { check?: string; maximum?: number } } })?._zod?.def;
    if (v4?.check === "max_length" && typeof v4.maximum === "number") return v4.maximum;
    const v3 = check as { kind?: string; value?: number };
    if (v3?.kind === "max" && typeof v3.value === "number") return v3.value;
  }
  return undefined;
}

/**
 * Enum members. v4 exposes `.options`; v3 keeps them on `_def.values`, and for
 * a native enum on `_def.values` as an object.
 */
function enumOptions(schema: ZodTypeAny): string[] | undefined {
  const direct = (schema as unknown as { options?: unknown[] }).options;
  if (Array.isArray(direct)) return direct.filter((o): o is string => typeof o === "string");
  const values = (schema as unknown as { _def?: { values?: unknown } })._def?.values;
  if (Array.isArray(values)) return values.filter((o): o is string => typeof o === "string");
  if (values && typeof values === "object") {
    return Object.values(values as Record<string, unknown>).filter(
      (o): o is string => typeof o === "string",
    );
  }
  return undefined;
}

/** Public: the option list for a select-shaped field, or null. */
export function schemaEnumOptions(schema: ZodTypeAny): string[] | null {
  const { schema: inner } = unwrapSchema(schema);
  return enumOptions(inner) ?? null;
}

/** Public: whether a field's type is optional-wrapped (i.e. not required). */
export function schemaIsOptional(schema: ZodTypeAny): boolean {
  const type = typeOf(schema);
  return type === "optional" || type === "default" || type === "nullish";
}

/**
 * The `.shape` of an object schema, seeing through effects wrappers.
 *
 * `.superRefine()` / `.refine()` / `.transform()` return a wrapper that does
 * NOT expose `.shape` — verified: `z.object({...}).superRefine(fn)` has
 * `_def.typeName === "ZodEffects"`, `.shape === undefined`, and the real object
 * on `_def.schema`. Reading `.shape` directly therefore returns nothing for any
 * schema with a cross-field rule, which is most of the interesting ones (the
 * payout form's UPI-vs-bank branch is exactly this shape).
 *
 * Failing to unwrap would not error — it would silently derive a form with
 * ZERO sections, which is the quiet-wrong-answer failure mode this whole wave
 * exists to eliminate.
 */
export function objectShape(schema: ZodTypeAny): Record<string, ZodTypeAny> | null {
  let current: ZodTypeAny = schema;
  for (let depth = 0; depth < 10; depth++) {
    const direct = (current as unknown as { shape?: Record<string, ZodTypeAny> }).shape;
    if (direct) return direct;
    const def = (current as unknown as {
      _def?: { schema?: ZodTypeAny; innerType?: ZodTypeAny; in?: ZodTypeAny };
    })._def;
    const next = def?.schema ?? def?.innerType ?? def?.in;
    if (!next) return null;
    current = next;
  }
  return null;
}

/**
 * Name patterns override the Zod type, because a name carries intent a type
 * cannot. `images` is `ZodArray` but it is a media field, not a list editor;
 * `description` is `ZodString` but it is a textarea.
 *
 * Ordered — the first match wins, so the media test runs before the long-text
 * one (`coverImage` must not become a textarea).
 */
const NAME_RULES: { test: RegExp; meta: Partial<FieldUiMeta> }[] = [
  {
    // Media claims a full row ALWAYS, and forces its section to keepMounted:
    // a MediaUploadField stacks a source-tab strip, a drop target, a progress
    // bar and a preview, and collapsing it mid-upload discards the transfer.
    test: /(^|[a-z])(image|images|photo|video|media|avatar|banner|logo|cover|thumbnail)([A-Z]|s?$)/i,
    meta: { kind: "media", row: "full", sectionKeepMounted: true },
  },
  {
    test: /^(description|body|content|notes?|bio|message|excerpt|answer|returnPolicy)$/i,
    meta: { kind: "textarea", row: "full" },
  },
  {
    // Long single inputs: truncating a URL or an address into half a row makes
    // it unreadable, so they take the whole row even though they are short types.
    test: /^(url|slug|email|title|name|displayName|headline|address|addressLine1|addressLine2|line1|line2)$/i,
    meta: { row: "full" },
  },
  {
    test: /^(firstName|lastName|city|state|postcode|pincode|postalCode|ifsc|gstin|pan|hsn|price|rate|percent|quantity|phone)$/i,
    meta: { row: "pair" },
  },
];

/**
 * Fields nothing should ever render as an input — ids, audit stamps and
 * counters. Marked `derived` so `audit-form-field-roundtrip` reads them as
 * server-owned rather than as unreachable schema fields.
 */
const SERVER_OWNED = /^(id|createdAt|updatedAt|createdBy|updatedBy|ownerId|authorId|userId|views|viewCount|productCount|usageCount|helpfulCount|replyCount|reportCount)$/;

/** Zod type → its default control and row span. */
function fromZodType(type: string, inner: ZodTypeAny): Partial<FieldUiMeta> {
  switch (type) {
    case "boolean":
      // Several per wrapping row — a switch plus label is short, and stacking
      // them one-per-row makes a settings section endless.
      return { kind: "toggle", row: "quarter" };
    case "enum":
    case "nativeEnum":
    case "literal":
    case "union":
      return { kind: "select", row: "pair" };
    case "date":
      return { kind: "date", row: "pair" };
    case "number":
    case "bigint":
      return { kind: "number", row: "pair" };
    case "array":
      return { kind: "list", row: "full" };
    case "object":
    case "record":
      return { kind: "list", row: "full" };
    case "string": {
      const max = stringMaxLength(inner);
      return max != null && max > 200
        ? { kind: "textarea", row: "full" }
        : { kind: "text", row: "pair" };
    }
    default:
      return { kind: "text", row: "pair" };
  }
}

/**
 * Everything about a field's layout that can be derived from its name and its
 * Zod type. `section` is never inferred, so the return type is a Partial —
 * `resolveFieldUiMeta` is what merges it with the explicit registration.
 *
 * This is what makes annotation cheap: a 13-field form is 13 short
 * `.register(ui, { section: "…" })` calls, not 13 full metadata objects.
 */
export function inferFieldUiMeta(name: string, schema: ZodTypeAny): Partial<FieldUiMeta> {
  const { schema: inner, type } = unwrapSchema(schema);
  const meta: Partial<FieldUiMeta> = { ...fromZodType(type, inner) };

  for (const rule of NAME_RULES) {
    if (rule.test.test(name)) {
      Object.assign(meta, rule.meta);
      break;
    }
  }

  if (SERVER_OWNED.test(name)) {
    meta.derived = true;
    meta.tier = meta.tier ?? "t2-server";
  }

  // >5 options is the standing PaginatedSelect threshold. Recorded as `help`
  // rather than a separate flag so the renderer can decide without a second
  // source of truth about what "many options" means.
  const options = enumOptions(inner);
  if (meta.kind === "select" && options != null && options.length > 5) {
    meta.help = meta.help ?? "paginated";
  }

  return meta;
}

/**
 * The field's final metadata: inference first, explicit registration on top.
 *
 * Returns `null` when the field has no registration at all — the caller
 * decides whether that is a hard error (a registered form schema, where
 * `section` is mandatory) or a fallback (an ad-hoc schema being previewed).
 */
export function resolveFieldUiMeta(
  name: string,
  schema: ZodTypeAny,
): FieldUiMeta | null {
  const explicit = ui.get(schema);
  if (!explicit) return null;
  return { ...inferFieldUiMeta(name, schema), ...explicit };
}
