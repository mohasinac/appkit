import type { z } from "zod";
import type { JsonObject } from "../../../../../schemas/types";

/**
 * A minimal, self-contained Zod -> JSON Schema converter for assistant tool
 * input schemas.
 *
 * ## 🛑 Not `zod.toJSONSchema()` — appkit pins zod `^3.24`, which has no such export
 *
 * This engine was originally built against zod 4's native `toJSONSchema()`
 * (the consumer app depends on zod `^4.3.6`), but appkit is a separate
 * package pinned to zod `^3.24` across 148 files — bumping that major
 * version to accommodate one relocated feature is a cross-cutting dependency
 * change this move did not ask for, and is out of scope here. This module
 * covers exactly the shapes the built-in tools' input schemas use (string,
 * optional, enum, number, boolean, array, object) via zod 3's `_def`
 * introspection — the same technique the `zod-to-json-schema` package uses,
 * inlined rather than added as a dependency because the surface needed is
 * this small.
 *
 * 🛑 This is a HINT for the model, not a validator. The real gate stays
 * `tool.inputSchema.safeParse()` in `turn.ts` — an unmodelled shape here
 * degrades to an unconstrained JSON Schema node rather than throwing,
 * because a wrong hint only costs the model a clarifying round, while a
 * throw here would take the whole turn down for a tool nobody has used yet.
 *
 * Extend this, not the tool definitions, if a future tool's input schema
 * needs a shape not listed above.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */
export function zodInputToJsonSchema(schema: z.ZodTypeAny): JsonObject {
  return convert(schema);
}

function typeNameOf(schema: z.ZodTypeAny): string {
  return (schema as unknown as { _def: { typeName: string } })._def.typeName;
}

function isOptional(schema: z.ZodTypeAny): boolean {
  const name = typeNameOf(schema);
  return name === "ZodOptional" || name === "ZodDefault" || name === "ZodNullable";
}

function convert(schema: z.ZodTypeAny): JsonObject {
  const typeName = typeNameOf(schema);
  const def = schema._def as Record<string, unknown>;

  switch (typeName) {
    case "ZodObject": {
      const shape = (schema as unknown as { shape: Record<string, z.ZodTypeAny> }).shape;
      const properties: Record<string, JsonObject> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = convert(value);
        if (!isOptional(value)) required.push(key);
      }
      return {
        type: "object",
        properties,
        ...(required.length ? { required } : {}),
        additionalProperties: false,
      };
    }
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
      return convert(def.innerType as z.ZodTypeAny);
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodEnum":
      return { type: "string", enum: def.values as readonly string[] };
    case "ZodArray":
      return { type: "array", items: convert(def.type as z.ZodTypeAny) };
    default:
      return {};
  }
}
