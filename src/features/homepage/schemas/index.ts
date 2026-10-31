export * from "./firestore";

// ─── Firestore document schemas (W2) ──────────────────────────────────────────
// Mirrors HomepageSectionDocument in ./firestore.ts. Registered into:
//   SCHEMAS.firestore.homepageSections
//
// 🛑 The carouselSlides/carousels Zod schemas that used to live here (and the
// SCHEMAS.firestore.carouselSlides/carousels registrations) were deleted
// 2026-10-31 along with the Firestore collections they validated — see
// ./firestore.ts's file header.
//
// Per-section-type config schemas live in adminSectionsBuildParse (W5 row 1).
// Here the `config` field is treated as a typed `Record<string, JsonValue>` —
// the section-builder schemas validate it at the form boundary.

import { z } from "zod";
import { DEFAULT_SECTION_ORDER, SECTION_SURFACE_VALUES } from "./firestore";
import type { SectionType } from "./firestore";
import { auditTimestampsShape } from "../../../schemas/firestore-helpers";
import type { JsonValue } from "../../../schemas/types";

/**
 * 🛑 GENUINELY derived from `SectionType`, not a parallel hand-written list.
 *
 * This used to be a literal `z.enum([...25 strings...])`, with a docstring one
 * screen up claiming it was "derived from the union, so that gap cannot
 * reopen." It was not derived — it was a hand-typed duplicate that happened to
 * agree with `SectionType` on the day it was written, with nothing enforcing
 * that agreement afterward. Adding a 26th section type without also editing
 * this array would 400 every save of the new type — exactly the failure the
 * docstring claimed was already closed.
 *
 * `DEFAULT_SECTION_ORDER: Record<SectionType, number>` (`./firestore.ts`) is
 * already compile-checked exhaustive over `SectionType` — TypeScript refuses
 * to compile it if a union member is missing a key, or if an extra key exists
 * that isn't in the union. So `Object.keys(DEFAULT_SECTION_ORDER)` IS the
 * `SectionType` value set, genuinely, every time this file is built — adding
 * a type to the union without updating `DEFAULT_SECTION_ORDER` is now a `tsc`
 * error at THAT assignment, not a runtime 400 discovered on save.
 *
 * The cast is sound, not a loosening: `Object.keys` returns `string[]` only
 * because that's TypeScript's (overly conservative) built-in signature for
 * it — the compile-time guarantee from `DEFAULT_SECTION_ORDER`'s own type
 * is what actually makes the runtime values correct.
 */
export const homepageSectionTypeSchema = z.enum(
  Object.keys(DEFAULT_SECTION_ORDER) as [SectionType, ...SectionType[]],
);

// JsonValue Zod — used for section configs whose shape varies per section type.
// The section-builder schemas (W5 row 1) provide the per-type validation.
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const homepageSectionFirestoreSchema = z.object({
  id: z.string(),
  type: homepageSectionTypeSchema,
  order: z.number().int(),
  enabled: z.boolean(),
  config: z.record(z.string(), jsonValueSchema),
  ...auditTimestampsShape,
});

/**
 * The create contract for a homepage section, shared by BOTH routes that can
 * create one — `POST /api/admin/sections` (what the editor calls) and
 * `POST /api/homepage-sections` (reachable by URL only).
 *
 * It exists because those two had drifted into being one validated path and
 * one raw `{...body}` spread, and because the validated one's hand-written
 * type list had fallen four values behind `SectionType` — so an admin could
 * configure a Featured Bundles / Prize Draws / Event Raffles / Collection
 * Cards section in full and get a 400 on save.
 *
 * `type` comes from `homepageSectionTypeSchema`, which is derived from the
 * union, so that gap cannot reopen.
 */
/*
 * 🛑 Derived from SECTION_SURFACE_VALUES, not restated as a literal list —
 * same discipline `homepageSectionTypeSchema` above now follows too (fixed
 * 2026-10-19; it used to be the hand-written duplicate this comment used to
 * warn about, with nothing enforcing parity with `SectionType`).
 */
export const sectionSurfaceSchema = z.enum(SECTION_SURFACE_VALUES);

export const homepageSectionCreateSchema = z.object({
  type: homepageSectionTypeSchema,
  enabled: z.boolean().optional().default(true),
  order: z.number().int().optional(),
  /*
   * A plain `z.object()` STRIPS unknown keys silently, so without this line a
   * caller's `surface` vanishes between the request and the handler with no
   * error anywhere — Root Cause #76. Absent still means "homepage".
   */
  surface: sectionSurfaceSchema.optional(),
  // Deliberately open. Every section type carries a different config shape,
  // and a closed schema here would silently STRIP the builder's output for any
  // type it did not enumerate — the `productBaseSchema` failure, one domain
  // over.
  config: z.record(z.string(), jsonValueSchema),
});

export type HomepageSectionCreateValues = z.infer<typeof homepageSectionCreateSchema>;

export type HomepageSectionFromSchema = z.infer<typeof homepageSectionFirestoreSchema>;
