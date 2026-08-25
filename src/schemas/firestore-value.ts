/*
 * WHY: A recursive "any value Firestore can store" schema, for the handful of
 *      document fields that are legitimately open-ended — a listing template's
 *      `defaults`, an analytics card's `filters`, a homepage section's
 *      `config`. Those fields cannot be closed: each carries a different shape
 *      per type, and a closed schema would SILENTLY STRIP whatever the builder
 *      produced for a type it did not enumerate, which is the
 *      `productBaseSchema` failure.
 *
 *      Open to JSON is not the same as open to anything. `z.unknown()` on such
 *      a field passes a function or a class instance straight to the Firestore
 *      driver, which then throws at write time rather than at parse time.
 *
 * WHAT: One definition, shared.
 *
 *       It was written twice independently before this — in
 *       `listing-template-form.ts` and about to be a third time in
 *       `analytics-forms.ts`. Rule of Three, so it moved here rather than
 *       being copied again.
 *
 * EXPORTS: firestoreValueSchema
 *
 * @tag domain:schemas
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:listing-template-form,analytics-forms
 * @tag sideEffects:none
 */

import { z } from "zod";
import type { FirestoreValue } from "./types";

/**
 * Recursive, so `z.lazy` — the array and record arms reference the schema
 * being defined. The explicit `z.ZodType<FirestoreValue>` annotation is
 * required: TypeScript cannot infer the type of a self-referential const.
 */
export const firestoreValueSchema: z.ZodType<FirestoreValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.date(),
    z.array(firestoreValueSchema),
    z.record(firestoreValueSchema),
  ]),
) as z.ZodType<FirestoreValue>;
