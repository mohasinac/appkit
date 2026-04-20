/**
 * deriveFormFields — @mohasinac/appkit/utils
 *
 * Schema → UI pipeline: automatically derive `ExtraFormField[]`-compatible
 * field configurations from a Zod object schema shape.
 *
 * This bridges the "Schema → UI → Action" pipeline gap: when a consumer
 * extends an appkit Zod schema with `.extend({ hsn: z.string() })`, they can
 * call `deriveFormFields(extendedSchema)` to get ready-to-use field configs
 * instead of manually authoring them.
 *
 * ## Design
 * - Works with any Zod `ZodObject` (or `ZodEffects` wrapping one)
 * - Infers `type`, `label`, `required`, `options` from the Zod type and metadata
 * - Compatible with `ExtraFormField` from `@mohasinac/appkit/contracts`
 * - Zero runtime dependency on React — returns plain config objects
 *
 * @example
 * ```ts
 * import { productCreateSchema } from "@mohasinac/appkit/features/products";
 * import { deriveFormFields } from "@mohasinac/appkit/utils";
 *
 * const extended = productCreateSchema.extend({
 *   hsn: z.string().describe("HSN Code"),
 *   origin: z.enum(["domestic", "imported"]).describe("Product Origin"),
 * });
 *
 * const fields = deriveFormFields(extended);
 * // → [{ key: "hsn", label: "HSN Code", inputType: "text", required: true }, ...]
 *
 * // Use directly as ExtraFormField render configs:
 * <ProductForm extraFields={fields.map(fieldToExtraFormField)} />
 * ```
 */

// --- Derived field config -----------------------------------------------------

export type DerivedFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "date"
  | "unknown";

export interface DerivedFieldOption {
  value: string;
  label: string;
}

/**
 * A single derived field configuration, inferred from a Zod schema shape.
 */
export interface DerivedField {
  /** The field key (matches the Zod schema property name). */
  key: string;
  /** Human-readable label, derived from the Zod `.describe()` annotation or camelCase key. */
  label: string;
  /** The inferred input type. */
  inputType: DerivedFieldType;
  /** Whether the field is required (non-optional, non-nullable Zod type). */
  required: boolean;
  /** For `select` and `multiselect` — the enum options. */
  options?: DerivedFieldOption[];
  /** The original Zod type descriptor string (for debugging). */
  zodTypeName: string;
}

// --- Zod introspection helpers (no Zod import — duck-typed) ------------------

interface ZodLike {
  _def?: {
    typeName?: string;
    description?: string;
    innerType?: ZodLike;
    schema?: ZodLike;
    values?: string[] | Record<string, string>;
    options?: ZodLike[];
    type?: ZodLike;
    items?: ZodLike;
  };
  shape?: Record<string, ZodLike>;
  isOptional?: () => boolean;
  isNullable?: () => boolean;
  description?: string;
}

function unwrapZodType(zodType: ZodLike): ZodLike {
  const typeName = zodType._def?.typeName ?? "";
  // Unwrap ZodOptional, ZodNullable, ZodDefault, ZodEffects
  if (
    typeName === "ZodOptional" ||
    typeName === "ZodNullable" ||
    typeName === "ZodDefault"
  ) {
    const inner = zodType._def?.innerType;
    if (inner) return unwrapZodType(inner);
  }
  if (typeName === "ZodEffects") {
    const inner = zodType._def?.schema;
    if (inner) return unwrapZodType(inner);
  }
  return zodType;
}

function getZodTypeName(zodType: ZodLike): string {
  return unwrapZodType(zodType)._def?.typeName ?? "unknown";
}

function isRequired(zodType: ZodLike): boolean {
  const typeName = zodType._def?.typeName ?? "";
  return (
    typeName !== "ZodOptional" &&
    typeName !== "ZodNullable" &&
    typeName !== "ZodDefault"
  );
}

function getEnumOptions(unwrapped: ZodLike): DerivedFieldOption[] | undefined {
  const typeName = unwrapped._def?.typeName ?? "";
  if (typeName === "ZodEnum") {
    const values = unwrapped._def?.values;
    if (Array.isArray(values)) {
      return values.map((v: string) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " "),
      }));
    }
    if (values && typeof values === "object") {
      return Object.entries(values).map(([, v]) => ({
        value: v as string,
        label:
          (v as string).charAt(0).toUpperCase() +
          (v as string).slice(1).replace(/_/g, " "),
      }));
    }
  }
  if (typeName === "ZodNativeEnum") {
    const values = unwrapped._def?.values;
    if (values && typeof values === "object" && !Array.isArray(values)) {
      return Object.entries(values)
        .filter(([k]) => isNaN(Number(k))) // skip reverse numeric mappings
        .map(([, v]) => ({
          value: v as string,
          label:
            (v as string).charAt(0).toUpperCase() +
            (v as string).slice(1).replace(/_/g, " "),
        }));
    }
  }
  return undefined;
}

function inferInputType(zodType: ZodLike): {
  inputType: DerivedFieldType;
  options?: DerivedFieldOption[];
} {
  const unwrapped = unwrapZodType(zodType);
  const typeName = getZodTypeName(zodType);

  const options = getEnumOptions(unwrapped);
  if (options) {
    return { inputType: "select", options };
  }

  switch (typeName) {
    case "ZodString": {
      const checks = (unwrapped._def as Record<string, unknown>)?.checks;
      if (Array.isArray(checks)) {
        const hasMax = checks.some(
          (c: { kind?: string; value?: number }) =>
            c.kind === "max" && typeof c.value === "number" && c.value > 200,
        );
        if (hasMax) return { inputType: "textarea" };
      }
      return { inputType: "text" };
    }
    case "ZodNumber":
    case "ZodBigInt":
      return { inputType: "number" };
    case "ZodBoolean":
      return { inputType: "boolean" };
    case "ZodDate":
      return { inputType: "date" };
    case "ZodArray": {
      const itemType = unwrapped._def?.type ?? unwrapped._def?.items;
      if (itemType) {
        const itemOptions = getEnumOptions(unwrapZodType(itemType));
        if (itemOptions)
          return { inputType: "multiselect", options: itemOptions };
      }
      return { inputType: "text" };
    }
    default:
      return { inputType: "unknown" };
  }
}

function keyToLabel(key: string): string {
  // camelCase → "Title Case With Spaces"
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

// --- Public API ---------------------------------------------------------------

/**
 * Options for `deriveFormFields`.
 */
export interface DeriveFormFieldsOptions {
  /**
   * Keys to omit from the derived field list.
   * Use to skip system-managed fields like `id`, `createdAt`, `updatedAt`.
   * Default: `["id", "createdAt", "updatedAt", "deletedAt"]`
   */
  omit?: string[];
  /**
   * Keys to include. If provided, only these keys are returned (in order).
   * Overrides `omit`.
   */
  include?: string[];
}

const DEFAULT_OMIT = ["id", "createdAt", "updatedAt", "deletedAt"];

/**
 * Derive `DerivedField[]` from a Zod object schema.
 *
 * Accepts any `ZodObject`, `ZodEffects(ZodObject)`, or any object with a
 * `.shape` property (duck-typed — no hard Zod import).
 *
 * @param schema   The Zod schema to introspect.
 * @param options  Optional config: `omit`, `include`.
 * @returns        Array of `DerivedField` descriptors, one per schema property.
 */
export function deriveFormFields(
  schema: unknown,
  options: DeriveFormFieldsOptions = {},
): DerivedField[] {
  const zodLike = schema as ZodLike;

  // Unwrap ZodEffects to reach the ZodObject
  const unwrapped = unwrapZodType(zodLike);
  const shape = unwrapped.shape;

  if (!shape || typeof shape !== "object") {
    return [];
  }

  const omitSet = new Set(options.omit ?? DEFAULT_OMIT);
  const includeSet = options.include ? new Set(options.include) : undefined;

  const allKeys = Object.keys(shape);
  const filteredKeys = allKeys.filter((key) => {
    if (includeSet) return includeSet.has(key);
    return !omitSet.has(key);
  });

  const ordered = includeSet
    ? [...(options.include ?? [])].filter((k) => filteredKeys.includes(k))
    : filteredKeys;

  return ordered.map((key): DerivedField => {
    const fieldType = shape[key];
    const unwrappedField = unwrapZodType(fieldType);
    const description =
      fieldType.description ??
      fieldType._def?.description ??
      unwrappedField.description ??
      unwrappedField._def?.description;

    const { inputType, options: fieldOptions } = inferInputType(fieldType);

    return {
      key,
      label: description ? String(description) : keyToLabel(key),
      inputType,
      required: isRequired(fieldType),
      options: fieldOptions,
      zodTypeName: getZodTypeName(fieldType),
    };
  });
}
