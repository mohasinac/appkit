/*
 * WHY: D13's last item — "which complete beys can I build RIGHT NOW from the
 *      parts I hold", answered server-side for one store.
 *
 * 🛑 THE DEFECT THIS IS SHAPED AROUND (I9). Matching a composition slot on
 *    `partGlossaryId` alone reports *"you can build an L-Drago Guardian
 *    S130MB"* when the only Metal Ball on the shelf is the Poison Zurafa's
 *    transparent-black one. One glossary row, same mould, same weight, same
 *    stats — two physical units that are not interchangeable and differ wildly
 *    in value, with no stat to tell them apart. A confident, specific, wrong
 *    answer with no error, discovered by the seller holding the wrong part.
 *
 *    So every match goes through `satisfiesSlot`, which keys on
 *    **(partGlossaryId, colourway)** and refuses a colour-unknown holding for a
 *    slot that names a colour — "unknown" is not evidence of the right colour.
 *
 * 🛑 THREE ROUND TRIPS, FLAT IN THE NUMBER OF PARTS HELD (Rule #6). The naive
 *    shape is one `getModelsUsingPart` per held part, which is N reads for a
 *    seller with N distinct parts. Instead: one bounded listing read, one
 *    `getAll` over the held glossary rows (whose `usedBy` the generator already
 *    wrote), one `getAll` over the candidate compositions. A seller with 3
 *    parts and a seller with 40 cost the same.
 *
 * @tag domain:parts
 * @tag layer:server-data
 * @tag access:server-only
 * @tag sideEffects:firestore-read
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { getAdminDb } from "../../../../providers/db-firebase";
import {
  MODEL_COMPOSITION_COLLECTION,
  PART_GLOSSARY_COLLECTION,
  type ModelCompositionDocument,
  type ModelSlot,
} from "../../../../features/parts/schemas/firestore";
import {
  matchSlotToHoldings,
  type PartHolding,
} from "../../../../features/parts/utils/colourway-match";
import { ANY_STATUS, listPublicProducts } from "../products/list-public";

/** Part listings read per store. The same cap the assembly drawer uses. */
export const BUILDABLE_HOLDINGS_LIMIT = 50;
/**
 * Candidate models considered. A seller holding common Metal-era parts can
 * reach several hundred compositions through `usedBy`; this bounds the second
 * `getAll` and the answer is truncated rather than partial-and-silent.
 */
export const BUILDABLE_CANDIDATE_LIMIT = 60;

export interface BuildableSlot {
  slotKey: string;
  slotLabel: string;
  partName: string;
  partId?: string;
  /** The colourway THIS model needs, when the corpus distinguishes one. */
  expectedColourway?: string;
  /** Complete units this slot alone could supply. */
  buildable: number;
}

export interface BuildableModel {
  compositionId: string;
  name: string;
  /** The named-model category, when the generator joined one. */
  categoryId?: string;
  /**
   * How many COMPLETE units are buildable — the MINIMUM across slots, never a
   * sum or an average: a bey missing one tip is not 80% of a bey.
   */
  buildable: number;
  slots: BuildableSlot[];
  /** Slot labels supplying zero. Named, because that is the shopping list. */
  blockedBy: string[];
}

export interface BuildableResult {
  models: BuildableModel[];
  /** Distinct part listings considered. */
  holdings: number;
  /** A cap was hit, so the answer is a floor rather than the whole truth. */
  truncated: boolean;
}

/** Slots that carry no glossary id cannot be matched and are not required. */
function requiredSlots(comp: ModelCompositionDocument): ModelSlot[] {
  return (comp.slots ?? []).filter((s) => typeof s.partId === "string" && s.partId.length > 0);
}

/**
 * What this store can build right now.
 *
 * Sorted by `buildable` descending and then by how close a blocked model is to
 * complete, so the useful answer ("you are one Spin Track away") is near the
 * top rather than buried under everything that is fully blocked.
 */
export async function listBuildableModels(storeId: string): Promise<BuildableResult> {
  const empty: BuildableResult = { models: [], holdings: 0, truncated: false };
  if (!storeId) return empty;

  try {
    const db = getAdminDb();

    /* 1 — the seller's own part listings, through the SHARED query. */
    const listing = await listPublicProducts({
      storeId,
      status: ANY_STATUS,
      page: 1,
      pageSize: BUILDABLE_HOLDINGS_LIMIT,
    });
    const holdings: PartHolding[] = (listing?.items ?? [])
      .filter((row) => typeof row.partGlossaryId === "string")
      .map((row) => ({
        productId: String(row.id),
        partGlossaryId: String(row.partGlossaryId),
        availableQuantity:
          typeof row.availableQuantity === "number" ? row.availableQuantity : 0,
        ...(typeof row.colourway === "string" ? { colourway: row.colourway } : {}),
      }))
      // A listing with nothing available cannot contribute to a build, and
      // keeping it would make `blockedBy` name a part the seller "has".
      .filter((h) => h.availableQuantity > 0);

    if (holdings.length === 0) {
      return { ...empty, truncated: listing?.truncated === true };
    }

    /* 2 — one `getAll` over the held glossary rows for their `usedBy`. */
    const heldIds = [...new Set(holdings.map((h) => h.partGlossaryId).filter((id): id is string => !!id))];
    const glossaryCol = db.collection(PART_GLOSSARY_COLLECTION);
    const partSnaps = await db.getAll(...heldIds.map((id) => glossaryCol.doc(id)));
    const candidateIds = new Set<string>();
    for (const snap of partSnaps) {
      if (!snap.exists) continue;
      for (const id of (snap.data()?.usedBy as string[] | undefined) ?? []) {
        if (id) candidateIds.add(id);
      }
    }
    if (candidateIds.size === 0) {
      return { models: [], holdings: holdings.length, truncated: listing?.truncated === true };
    }

    const candidates = [...candidateIds];
    const truncatedCandidates = candidates.length > BUILDABLE_CANDIDATE_LIMIT;
    const take = truncatedCandidates ? candidates.slice(0, BUILDABLE_CANDIDATE_LIMIT) : candidates;

    /* 3 — one `getAll` over those compositions. */
    const compCol = db.collection(MODEL_COMPOSITION_COLLECTION);
    const compSnaps = await db.getAll(...take.map((id) => compCol.doc(id)));

    const models: BuildableModel[] = [];
    for (const snap of compSnaps) {
      if (!snap.exists) continue;
      const comp = { id: snap.id, ...snap.data() } as ModelCompositionDocument;
      const slots = requiredSlots(comp);
      // A composition with no resolvable slot cannot be judged; claiming it is
      // buildable from zero requirements would be the worst possible answer.
      if (slots.length === 0) continue;

      const matched: BuildableSlot[] = slots.map((s) => {
        const m = matchSlotToHoldings(
          {
            // `SlotRequirement` is deliberately narrow: the matcher's whole
            // input is the (part, colourway) pair, so nothing else about the
            // slot can accidentally influence a match.
            ...(s.partId ? { partId: s.partId } : {}),
            ...(s.expectedColourway ? { expectedColourway: s.expectedColourway } : {}),
          },
          holdings,
        );
        return {
          slotKey: String(s.slotKey),
          slotLabel: s.slotLabel,
          partName: s.partName,
          ...(s.partId ? { partId: s.partId } : {}),
          ...(s.expectedColourway ? { expectedColourway: s.expectedColourway } : {}),
          buildable: m.buildable,
        };
      });

      models.push({
        compositionId: comp.id,
        name: comp.name,
        ...(comp.categoryId ? { categoryId: comp.categoryId } : {}),
        buildable: Math.min(...matched.map((m) => m.buildable)),
        slots: matched,
        blockedBy: matched.filter((m) => m.buildable === 0).map((m) => m.slotLabel),
      });
    }

    models.sort(
      (a, b) =>
        b.buildable - a.buildable ||
        a.blockedBy.length - b.blockedBy.length ||
        a.name.localeCompare(b.name),
    );

    return {
      models,
      holdings: holdings.length,
      truncated: listing?.truncated === true || truncatedCandidates,
    };
  } catch (err) {
    const e = normalizeError(err);
    /*
     * Fails CLOSED-but-loud: an empty list with `truncated: true`, so a caller
     * renders "we could not work this out" rather than the much worse
     * "you can build nothing" — which a seller holding a full set would read as
     * a bug in their inventory (Root Cause #59's lesson, applied to a rollup).
     */
    serverLogger.warn("listBuildableModels failed", { storeId, error: e.message });
    return { models: [], holdings: 0, truncated: true };
  }
}
