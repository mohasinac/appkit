/**
 * Field-level protection for hand-corrections to GENERATED reference data.
 *
 * ── 🛑 THE PROBLEM THIS SOLVES ────────────────────────────────────────────
 *
 * `partGlossary` (2,488 rows) and `beys` (1,988) are produced by committed
 * generators from a crawled corpus, and `appkit-seed load` writes them with
 * `set(doc, { merge: true })`. A merge-write overwrites every key present in
 * the payload — so an admin who corrects a wrong extracted weight loses that
 * correction on the next reseed, silently, and the row goes back to being
 * wrong while `appkit-seed status` reports the collection perfectly in sync
 * (it counts ids, and the id did not change).
 *
 * That is not hypothetical for this dataset. This session alone found five
 * wrong claims in the source corpus — an inverted tip transition, a mode that
 * was actually launch spin direction, a mechanism on the wrong part, a part
 * with no modes at all, and a part named "Duo:Dual" that is Delta Drive. A
 * hand-correction is the fast path for exactly those, and it has to survive.
 *
 * ── 🛑 FIELD-LEVEL, NOT ROW-LEVEL ────────────────────────────────────────
 *
 * The obvious shape is one boolean meaning "do not touch this row". It is
 * wrong: freezing a whole row because somebody fixed one weight means the row
 * stops receiving every genuine improvement the generator makes afterwards —
 * a better description, a newly resolved part id, a corrected release date.
 * The row quietly falls out of the dataset's own maintenance.
 *
 * So `adminEditedFields` names the keys a human owns. The loader strips
 * exactly those from its payload and writes everything else, which means a
 * corrected weight and an improved description can both be true at once.
 *
 * `adminEdited` is a plain boolean beside it purely so the loader can find
 * these rows with ONE equality query per collection instead of reading all
 * 4,476 documents to discover the handful that matter. `array-contains` on
 * `adminEditedFields` cannot answer "has any value", and an `orderBy` or `!=`
 * on it would silently exclude every row that lacks the field — which is all
 * of them (Root Cause #100).
 *
 * 🛑 KEEP THE TWO IN SYNC. `adminEdited` is `adminEditedFields.length > 0`.
 * Writing one without the other either hides a protected row from the loader
 * (so the edit is lost anyway) or makes the loader fetch a row with nothing to
 * protect. `applyAdminEdit` is the only function that should set either.
 */

/** The fields a human has taken ownership of on one generated row. */
export interface AdminEditableRecord {
  /**
   * `true` iff `adminEditedFields` is non-empty. Exists ONLY so the seed
   * loader can find protected rows with one indexed equality.
   */
  adminEdited?: boolean;
  /**
   * Keys the generator must not overwrite. Dot paths are NOT supported — a
   * nested object is owned whole, because a merge-write replaces a map wholesale
   * and protecting one leaf of it is not something `{ merge: true }` can express.
   */
  adminEditedFields?: string[];
  /** When the most recent hand-edit landed. Audit trail, never read by logic. */
  adminEditedAt?: Date;
  /** Who. The Auth UID, never a name — this travels into no public projection. */
  adminEditedBy?: string;
}

/**
 * Merge a hand-edit into a record, keeping the two protection fields honest.
 *
 * Returns the patch to write — the caller's changed fields plus the updated
 * ownership set. 🛑 Ownership is CUMULATIVE: editing the weight today and the
 * description tomorrow must leave both protected, so the existing set is
 * unioned rather than replaced.
 */
export function applyAdminEdit<TChanges extends object>(
  existing: Pick<AdminEditableRecord, "adminEditedFields"> | null | undefined,
  changes: TChanges,
  actorUid: string,
): TChanges & Required<Pick<AdminEditableRecord, "adminEdited" | "adminEditedFields">> & {
  adminEditedAt: Date;
  adminEditedBy: string;
} {
  const owned = new Set(existing?.adminEditedFields ?? []);
  for (const key of Object.keys(changes)) {
    /*
     * The protection fields themselves are never protected — that would make
     * the set unmodifiable by the next edit.
     */
    if (key.startsWith("adminEdited")) continue;
    owned.add(key);
  }
  const fields = [...owned].sort();
  return {
    ...changes,
    adminEditedFields: fields,
    adminEdited: fields.length > 0,
    adminEditedAt: new Date(),
    adminEditedBy: actorUid,
  };
}

/**
 * Strip the fields a human owns out of a generator payload.
 *
 * Used by `appkit/scripts/seed-cli.mjs`. Exported from here rather than
 * duplicated there so the rule has one definition — the CLI is `.mjs` and
 * reads this through the built package, the same way it reads the seed data.
 */
export function stripAdminOwnedFields<T extends object>(
  payload: T,
  ownedFields: readonly string[] | undefined,
): Partial<T> {
  if (!ownedFields?.length) return payload;
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (ownedFields.includes(k)) continue;
    (out as Record<string, never>)[k] = v as never;
  }
  return out;
}
