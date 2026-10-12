/**
 * D12 — reads for the public part surfaces.
 *
 * 🛑 Wrapped in `React.cache` where a page+`generateMetadata` pair shares the
 * call, and the NARROWEST shared call is cached rather than the exported one:
 * `React.cache` memoises per argument list, so two call sites passing
 * different arguments get two entries and dedupe nothing.
 */
import { cache } from "react";
import {
  PART_GLOSSARY_COLLECTION,
  MODEL_COMPOSITION_COLLECTION,
  partGlossaryId,
  type PartGlossaryDocument,
  type ModelCompositionDocument,
  type PartSlot,
} from "../../../../features/parts/schemas/firestore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";

/** One part, by `(slot, code|name)` — the only key this collection has. */
export const getPartByKey = cache(
  async (slot: PartSlot, codeOrName: string): Promise<PartGlossaryDocument | null> => {
    try {
      const snap = await getAdminDb()
        .collection(PART_GLOSSARY_COLLECTION)
        .doc(partGlossaryId(slot, codeOrName))
        .get();
      return snap.exists ? ({ id: snap.id, ...snap.data() } as PartGlossaryDocument) : null;
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("getPartByKey failed", { slot, codeOrName, error: e.message });
      return null;
    }
  },
);

/**
 * The models that use a part, hydrated.
 *
 * 🛑 `getAll` over the ids the part ALREADY carries, not a query. `usedBy` is
 * written by the generator, so this is one round trip for N ids with no index
 * and no scan — and it is bounded by how many models actually use the part
 * (measured max: 20).
 */
export const getModelsUsingPart = cache(
  async (partId: string): Promise<ModelCompositionDocument[]> => {
    try {
      const db = getAdminDb();
      const part = await db.collection(PART_GLOSSARY_COLLECTION).doc(partId).get();
      const ids = ((part.data()?.usedBy as string[] | undefined) ?? []).slice(0, 24);
      if (ids.length === 0) return [];
      const col = db.collection(MODEL_COMPOSITION_COLLECTION);
      const snaps = await db.getAll(...ids.map((id) => col.doc(id)));
      return snaps
        .filter((s) => s.exists)
        .map((s) => ({ id: s.id, ...s.data() }) as ModelCompositionDocument);
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("getModelsUsingPart failed", { partId, error: e.message });
      return [];
    }
  },
);

/** One model's composition, by the corpus doc id. */
export const getCompositionById = cache(
  async (id: string): Promise<ModelCompositionDocument | null> => {
    try {
      const snap = await getAdminDb().collection(MODEL_COMPOSITION_COLLECTION).doc(id).get();
      return snap.exists ? ({ id: snap.id, ...snap.data() } as ModelCompositionDocument) : null;
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("getCompositionById failed", { id, error: e.message });
      return null;
    }
  },
);

/**
 * Hydrate the glossary rows a composition's slots point at, so a model page can
 * link each slot and show its weight.
 *
 * ONE `getAll` for every slot — a per-slot read would be five round trips on a
 * page that already has its own.
 */
export const getPartsForComposition = cache(
  async (compositionId: string): Promise<Map<string, PartGlossaryDocument>> => {
    const out = new Map<string, PartGlossaryDocument>();
    try {
      const db = getAdminDb();
      const comp = await getCompositionById(compositionId);
      const ids = (comp?.slots ?? [])
        .map((s) => s.partId)
        .filter((id): id is string => !!id);
      if (ids.length === 0) return out;
      const col = db.collection(PART_GLOSSARY_COLLECTION);
      const snaps = await db.getAll(...[...new Set(ids)].map((id) => col.doc(id)));
      for (const s of snaps) {
        if (s.exists) out.set(s.id, { id: s.id, ...s.data() } as PartGlossaryDocument);
      }
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("getPartsForComposition failed", { compositionId, error: e.message });
    }
    return out;
  },
);

/**
 * Compositions for a named-model CATEGORY.
 *
 * 🛑 ONE INDEXED EQUALITY on `categoryId`, joined at SEED-GENERATION time.
 *
 * The first version queried `searchTxt` on `modelComposition` — a field that
 * collection does not have, so it would have matched NOTHING while looking
 * like a working read. The two id spaces genuinely disagree
 * (`gen1-plastic-dragoon-f` vs `category-dragoon-f`), so a join is required;
 * doing it in the generator makes it deterministic, reviewable in the
 * committed seed, and one equality here instead of a name query.
 *
 * Measured: **210 of 259** compositions join. The join is on the normalised
 * name, and on the name with its parenthetical expansion removed — the corpus
 * titles HMS beys `Aero Knight MS (Aero Knight Metal Sky)` where the category
 * is "Aero Knight MS", and without that second form only 150 matched.
 *
 * 🛑 A non-match leaves `categoryId` unset and this returns `[]`, so the model
 * page shows no composition. That is honest: a fuzzy match could attach
 * ANOTHER bey's parts, and a wrong part list is worse than none. Reconciling
 * the remaining 49 is E3's job.
 */
export const getCompositionsForCategory = cache(
  async (categoryId: string): Promise<ModelCompositionDocument[]> => {
    if (!categoryId) return [];
    try {
      const snap = await getAdminDb()
        .collection(MODEL_COMPOSITION_COLLECTION)
        .where("categoryId", "==", categoryId)
        .limit(8)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ModelCompositionDocument);
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("getCompositionsForCategory failed", { categoryId, error: e.message });
      return [];
    }
  },
);
