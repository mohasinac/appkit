/**
 * E4/D12 — the PART GLOSSARY and MODEL COMPOSITION collections.
 *
 * Seeded from `docs/research/part-composition-2026-10/`, which is extracted
 * from the local corpus by two committed scripts. Nothing here is hand-typed.
 *
 * ── 🛑 KEYED ON (classification, code), NEVER ON THE CODE ALONE ────────────
 *
 * `105` is a Metal Fight spin-track height, a bare number in Burst is a disc,
 * and `1-60` is a Beyblade X ratchet. Code-alone would explain a Burst disc as
 * a spin track — the same namespacing argument as the feature `group` field,
 * and the reason the document id carries both halves.
 *
 * ── 🛑 WHY `modelComposition` IS A SIBLING, NOT A FIELD ON `categories` ────
 *
 * A named model IS a category leaf (section 4.4), so composition "belongs" to that
 * document — and putting it there is still wrong for two measured reasons.
 * `handleCategoryWrite` calls `notifyRevalidate` as its FIRST statement,
 * unconditionally, so any write to a category drops that page's ISR entry on a
 * project paused at 15.5× its ISR cap. And `CategoryDetailPageView` is already
 * at Rule #6's read ceiling with seven parallel reads. Same conclusion as
 * `categoryCounts` and `priceIndex`, for the same reasons.
 *
 * ── 🛑 THE SLOT SET IS DATA, KEYED ON `system` ─────────────────────────────
 *
 * Slots MERGE: the corpus contains `Spin Gear + Blade Base → RUNNING CORE`
 * (HMS) and `SPIN TRACK + TIP combined: F:D` (4D), 13 such lines extracted. So
 * a fixed field-set per generation cannot express the data, and a
 * `Record<Generation, Slot[]>` would be the hand-written enumeration of Root
 * Cause #61 with a merge case it structurally cannot hold.
 */
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const PART_GLOSSARY_COLLECTION = "partGlossary" as const;
export const MODEL_COMPOSITION_COLLECTION = "modelComposition" as const;

/**
 * The canonical slot keys, as extracted. Mirrors `SLOT_VOCAB` in
 * `scripts/extract-part-composition.mjs` — the script is the source and this
 * is the type, so a slot that appears in one and not the other is a
 * compile-visible gap rather than a silent one.
 */
export const PART_SLOT_VALUES = {
  BIT_CHIP: "bit-chip",
  ATTACK_RING: "attack-ring",
  WEIGHT_DISK: "weight-disk",
  SPIN_GEAR: "spin-gear",
  ENGINE_GEAR: "engine-gear",
  BLADE_BASE: "blade-base",
  RUNNING_CORE: "running-core",
  FACE_BOLT: "face-bolt",
  ENERGY_RING: "energy-ring",
  FUSION_WHEEL: "fusion-wheel",
  CHROME_WHEEL: "chrome-wheel",
  SPIN_TRACK: "spin-track",
  PERFORMANCE_TIP: "performance-tip",
  LAYER: "layer",
  DISC: "disc",
  DRIVER: "driver",
  ARMOUR: "armour",
  BLADE: "blade",
  RATCHET: "ratchet",
  BIT: "bit",
} as const;

export type PartSlot = (typeof PART_SLOT_VALUES)[keyof typeof PART_SLOT_VALUES];

/**
 * Buyer-facing label per slot.
 *
 * 🛑 A `Record<PartSlot, string>`, so a 21st slot is a COMPILE ERROR rather
 * than a page heading that reads `performance-tip`. That is the whole reason
 * it is not derived by title-casing the key: "Armour" is not "armour"
 * title-cased in the corpus, and `bit-chip` is "Bit Chip" rather than
 * "Bit-chip".
 *
 * Every label here was read off the live documents' own `classification`
 * field, not invented — all 20 slots are populated (87 attack rings down to
 * 4 armour pieces), so none of these is a guess about an empty bucket.
 */
export const PART_SLOT_LABEL: Record<PartSlot, string> = {
  "bit-chip": "Bit Chip",
  "attack-ring": "Attack Ring",
  "weight-disk": "Weight Disk",
  "spin-gear": "Spin Gear",
  "engine-gear": "Engine Gear",
  "blade-base": "Blade Base",
  "running-core": "Running Core",
  "face-bolt": "Face Bolt",
  "energy-ring": "Energy Ring",
  "fusion-wheel": "Fusion Wheel",
  "chrome-wheel": "Chrome Wheel",
  "spin-track": "Spin Track",
  "performance-tip": "Performance Tip",
  layer: "Layer",
  disc: "Disc",
  driver: "Driver",
  armour: "Armour",
  blade: "Blade",
  ratchet: "Ratchet",
  bit: "Bit",
};

/** Every slot key, for an index page that must not hand-write the list. */
export const ALL_PART_SLOTS = Object.values(PART_SLOT_VALUES) as readonly PartSlot[];

/**
 * A URL segment to a slot, or `null`.
 *
 * 🛑 Returns `null` rather than casting. A bare `as PartSlot` on a URL segment
 * is how `/parts/nonsense/x` becomes a doc read for `nonsense--x` that quietly
 * misses — the route must 404, which it can only do if the guard says so.
 */
export function partSlotFromSegment(segment: string): PartSlot | null {
  const hit = ALL_PART_SLOTS.find((s) => s === segment);
  return hit ?? null;
}

/** One part. */
export interface PartGlossaryDocument extends BaseDocument {
  /** `${slot}--${codeOrSlug}` — both halves, because a code is not unique. */
  id: string;
  /** Buyer-facing label: "Performance Tip", "Fusion Wheel". */
  classification: string;
  /** The canonical slot key this classification maps to. */
  slot: PartSlot;
  /**
   * The short code as printed on the part. `null` for a part the corpus knows
   * only by name.
   *
   * 🛑 `null`, not `""`. An empty string reads as a declared empty code; 736
   * of 759 parts genuinely have no code in any source we hold, and that is a
   * fact about the sources rather than missing data.
   */
  code: string | null;
  /** The spoken name — what a buyer types. */
  name: string;
  /** Grams, when a source confirmed one. 97 of 759 do. */
  weightG?: number;
  /**
   * Model ids that use this part — the single most useful thing a part page
   * says, and the reason the glossary is worth having as a collection rather
   * than a lookup table.
   */
  usedBy?: string[];
  /** Code, name and the spoken form of the code — feeds `searchTxt`. */
  aliases?: string[];
  /** Which extractor source contributed the row. */
  source?: string;
  searchTxt?: string[];
}

/** One slot of one model's composition. */
export interface ModelSlot {
  slotKey: PartSlot;
  /** The corpus's own term for the slot, e.g. "METAL ATTACK RING (MAR)". */
  slotLabel: string;
  partName: string;
  weightG?: number;
  /** The `partGlossary` id, when the part resolved to a glossary row. */
  partId?: string;
}

/**
 * Two slots collapsing into one, in systems where they are a single moulded
 * module.
 *
 * 🛑 This is why the slot set cannot be a per-generation constant: HMS has a
 * `RUNNING CORE` where Plastic Gen has a separate Spin Gear and Blade Base,
 * and 4D has a combined `4D Bottom` where MFB has a Spin Track and a tip.
 */
export interface ModelSlotMerge {
  into: PartSlot;
  merges: PartSlot[];
}

export interface ModelCompositionDocument extends BaseDocument {
  /** The corpus doc id, e.g. `gen2-mfb-big-bang-pegasus`. */
  id: string;
  name: string;
  /** `gen1` … `gen4`, normalised — never the raw freeform header. */
  generation: string | null;
  /**
   * The parenthetical from the raw header, kept because it is often the
   * interesting part — but never a value anything groups or filters on
   * (Root Cause #33).
   */
  generationNote?: string;
  system?: string | null;
  series?: string | null;
  productCode?: string | null;
  slots: ModelSlot[];
  slotMerges?: ModelSlotMerge[];
  /** The corpus file, so a claim can be traced back. */
  source?: string;
  /** The named-model category this composition describes, when one exists. */
  categoryId?: string;
  searchTxt?: string[];
}

/** `(slot, code|name)` → document id. The ONE place this is composed. */
export function partGlossaryId(slot: PartSlot, codeOrName: string): string {
  const tail = codeOrName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slot}--${tail}`;
}

/**
 * Whether a listing of this TYPE is the physical assembly the composition
 * describes.
 *
 * 🛑 Found by measuring rather than by reasoning, and it is a real defect the
 * first version of D12 shipped: of 71 live products exactly ONE files under a
 * leaf that has a composition, and that one is
 * `art-dranzer-phoenix-poster` — so the only listing in the whole catalogue
 * that got a "Parts" tab was a POSTER, offering an attack ring, a weight disk
 * and a blade base as its contents. Nothing errored; it rendered a correct
 * part list for the wrong kind of object.
 *
 * The distinction is whether the listing IS the model or merely DEPICTS or
 * REFERENCES it. A print, a sticker sheet and a redemption code all sit under
 * the model's leaf on purpose (section 4.4: a sticker sheet belongs beside the
 * bey it is for) and none of them is made of its parts.
 *
 * 🛑 A `Record<ListingType, boolean>`, so a tenth listing type cannot compile
 * without answering the question — the lesson of Root Cause #61, which this
 * codebase has paid for ten hand-written enumerations of one union.
 */
export const LISTING_TYPE_HAS_COMPOSITION: Record<
  import("../../products/types/index").ListingType,
  boolean
> = {
  standard: true,
  auction: true,
  "pre-order": true,
  "prize-draw": true,
  classified: true,
  live: true,
  // Depicts the model; is not the model.
  art: false,
  stickers: false,
  // A redemption code has no physical parts at all.
  "digital-code": false,
};
