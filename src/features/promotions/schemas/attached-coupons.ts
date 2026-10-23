import { z } from "zod";
import { ATTACHED_COUPON_MAX } from "../constants/attached-coupons";

/**
 * The write shape for any `couponIds`-style field — one definition, imported
 * by the event schema, the blog schema and both admin API routes.
 *
 * 🛑 ONE definition on purpose. Four hand-written `z.array(z.string())`s would
 * be four chances for the cap to drift, and a cap enforced on three of four
 * write paths is not a cap — the fourth is simply the way in. This is the same
 * failure as the ten hand-maintained copies of the `ListingType` union in
 * Root Cause #61.
 *
 * `.max()` carries a message because this one is reachable by a human in an
 * admin form, and "Too big: expected array to have <=10 items" is not an
 * instruction.
 */
/*
 * 🛑 THE EXPLICIT ANNOTATION IS LOAD-BEARING — do not delete it as redundant.
 *
 * This repo runs TWO zod majors: appkit is pinned to 3.25.76 (peer `^3.24.0`)
 * and the consumer app resolves 4.4.3. Inferred, this export's `.d.ts` reads
 * `z.ZodOptional<z.ZodArray<z.ZodString, "many">>` — and zod 4's `ZodArray`
 * takes ONE type parameter, not two. The consumer cannot resolve that shape,
 * the inference collapses to `unknown`, and four admin routes fail with
 * `Type 'unknown' is not assignable to type 'string[] | undefined'`.
 *
 * `z.ZodType<T>` is spelled the same in both majors and `z.infer` yields `T`
 * from it either way, so the emitted declaration stays resolvable on both
 * sides of the boundary.
 *
 * The real defect is the version split — appkit's declared peer range and the
 * app's installed major disagree — and aligning them is a migration, not a
 * drive-by. Until that happens, any appkit zod schema a consumer infers from
 * needs this treatment.
 */
export const attachedCouponIdsSchema: z.ZodType<string[] | undefined> = z
  .array(z.string().min(1))
  .max(ATTACHED_COUPON_MAX, `At most ${ATTACHED_COUPON_MAX} coupons can be attached.`)
  .optional();

/**
 * Dedupe and drop blanks. Still ONE definition — it moved out of the schema,
 * it did not become four copies.
 *
 * 🛑 WHY IT IS NOT A `.transform()` ANY MORE, which is where it started:
 *
 * `.transform()` wraps the schema in `z.ZodEffects`, and **`ZodEffects` is a
 * zod 3 type that does not exist in zod 4**. This repo runs both — appkit is
 * pinned to zod 3.25.76 (peer `^3.24.0`) while the consumer app resolves zod
 * 4.4.3 — so appkit's emitted `.d.ts` referenced a type the consumer's zod
 * cannot resolve, the inference collapsed to `unknown`, and four admin routes
 * failed to typecheck with `Type 'unknown' is not assignable to type
 * 'string[] | undefined'`.
 *
 * The declared peer range is the thing that is actually wrong here, and
 * aligning the two majors is a real migration rather than a drive-by. Until
 * then: no schema crossing the package boundary may use `.transform()`,
 * `.refine()` or `.preprocess()`, because all three produce `ZodEffects`.
 *
 * Callers apply this after parsing, which is the same boundary the dedupe
 * always ran at — the route, not the client.
 */
export function dedupeAttachedCouponIds(
  ids: readonly string[] | undefined,
): string[] | undefined {
  if (!ids) return undefined;
  return Array.from(new Set(ids.filter(Boolean)));
}
