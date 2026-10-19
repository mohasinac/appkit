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

/**
 * Which CATEGORY node a part of this classification is filed under.
 *
 * ── 🛑 A PART IS A PLAIN CATEGORY LEAF, `categoryType` OMITTED ──────────────
 *
 * The user's instruction was *"treat parts as also categories, let admins
 * create or add more of them"*, and this map is how both halves are answered at
 * once: a part leaf under these nodes gets `deriveTaxonomy`'s ancestor chain,
 * `countersReconcile`'s tally, the sitemap, breadcrumbs, SEO, an OG image and
 * **the existing admin category editor** — create, edit and delete included —
 * for no new code.
 *
 * 🛑 `categoryType` is OMITTED rather than given a new `"part"` value, and that
 * is the decisive design point. 92 files read `categoryType`, and section 4.4
 * records that `categoryType: "sublisting"` carries SEVEN live defects
 * precisely because a new discriminator value opts out of every path that
 * works — `deriveTaxonomy` never reads it, `countersReconcile` leaves its count
 * permanently 0, and the sitemap excludes it by name. An omitted type changes
 * none of those 92 files and inherits every one of those paths.
 *
 * ── 🛑 KEYED ON THE SLOT ALONE, NOT ON (slot, generation) ───────────────────
 *
 * The first version derived a part's generation from its `usedBy` models, which
 * measured **681 of 753 placeable, 72 unplaceable and 1 spanning two
 * generations**. That was solving a problem that does not exist: each of the 20
 * classification names belongs to exactly ONE generation's vocabulary. A
 * "Performance Tip" is Metal-era by definition, a "Driver" is Burst, a "Bit" is
 * X and a "Bit Chip" is Plastic Gen — the words are not shared. Keying on the
 * slot places **all 753** and cannot be wrong about a part whose `usedBy` is
 * thin.
 *
 * A `Record<PartSlot, string>`, so a 21st classification cannot compile without
 * being given a home — and a part leaf with no parent is a tier-0 orphan, which
 * is the live defect the store sublisting POST still has.
 */
export const PART_SLOT_CATEGORY: Record<PartSlot, string> = {
  // Plastic Generation / HMS — Takara, pre-2006.
  "attack-ring": "category-original-attack-rings",
  "weight-disk": "category-original-weight-disks",
  "blade-base": "category-original-blade-bases",
  "bit-chip": "category-original-bit-chips",
  "spin-gear": "category-original-spin-gears",
  "engine-gear": "category-original-engine-gears",
  "running-core": "category-original-running-cores",
  // Metal Fight / 4D.
  "face-bolt": "category-metal-face-bolts",
  "energy-ring": "category-metal-energy-rings",
  "fusion-wheel": "category-metal-fusion-wheels",
  "chrome-wheel": "category-metal-chrome-wheels",
  "spin-track": "category-metal-spin-tracks",
  "performance-tip": "category-metal-performance-tips",
  // Burst.
  layer: "category-burst-layers",
  disc: "category-burst-discs",
  driver: "category-burst-drivers",
  armour: "category-burst-chips-armour",
  // Beyblade X.
  blade: "category-x-blades",
  ratchet: "category-x-ratchets",
  bit: "category-x-bits",
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
  /*
   * 🛑 `searchTxt?: string[]` was REMOVED here, and must not come back.
   *
   * It was declared and never written — 0 of 752 documents had it, for the
   * whole life of the collection — so a field that looked like a search
   * index was a promise the corpus could not keep, and it was invisible to
   * `audit-searchtxt-migration` because the collection appeared in none of
   * its buckets.
   *
   * Parts are searchable, and better than they would have been with tokens:
   * they are in the public search ARTIFACT, which gives substring matching
   * (`ariza` finds Charizard) that `array-contains` edge n-grams
   * structurally cannot. Writing 752 documents' worth of tokens to serve a
   * query path the artifact makes unnecessary is the speculative-infra
   * pattern this codebase retired `route-schema-registry` for.
   *
   * The collection is declared `INDEX_ARTIFACT_ONLY` in that audit, whose
   * rule is precisely that a member must NOT declare this field.
   */
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
  /**
   * I9 — which COLOURWAY of that part this model needs.
   *
   * ── 🛑 THE CASE THIS EXISTS FOR, in the user's own words ────────────────
   *
   * *"there is a part called metal ball, it comes with 2 beyblades — Poison
   * Zurafa S130MB and L-Drago Guardian S130MB. But the L-Drago version is very
   * rare and costly and is in silver, while the Zurafa one is transparent black
   * with a metal tip. Both behave the same way and have the same design, but to
   * make an L-Drago bey I need the silver one and for Zurafa the black
   * transparent one. Same with their S130s."*
   *
   * So: ONE glossary row (`performance-tip--mb`), same mould, same weight, same
   * stats — and TWO physical variants that are NOT interchangeable and differ
   * wildly in value. No stat distinguishes them.
   *
   * ── 🛑 WHY THIS FIELD RATHER THAN MATCHING ON `partId` ALONE ────────────
   *
   * The "buildable now" rollup would otherwise report *"you can build an
   * L-Drago Guardian S130MB"* while the only MB on the shelf is the Zurafa
   * black. A confident, specific, wrong answer with no error anywhere — and the
   * seller discovers it holding the wrong part. Matching has to be
   * `(partId, colourway)`.
   *
   * ── 🛑 UNSET MEANS "ANY", AND NEVER "THE FIRST ONE FOUND" ───────────────
   *
   * Most slots are genuinely colour-agnostic. Forcing a value everywhere would
   * invent a constraint the corpus does not support, and defaulting to whatever
   * happened to be in the bin is the same class of guess the price index
   * refuses when its sample is too small.
   */
  expectedColourway?: string;
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
  // 🛑 No `searchTxt` — see the note on PartGlossaryDocument above. 0 of 259
  // documents ever had one; compositions are reachable through the public
  // search artifact instead.
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
  /*
   * 🛑 FALSE, and this is the one entry worth arguing for.
   *
   * `spares` is tempting to set true — it is the most part-shaped type in the
   * union — and it would be a worse version of the exact defect this map's
   * docblock records. A spare attack ring IS a part; it is not the assembly
   * the composition describes. True would give an attack ring a "Parts" tab
   * whose contents are an attack ring, a weight disk and a blade base: one
   * level deeper into wrong than the poster was.
   *
   * The reverse direction is the useful one and it is phase F: a spare links
   * UP to its glossary entry via `sparePartGlossaryId`, and that entry lists
   * the models the part fits. "What is this a part of" is a real question; "what
   * parts is this part made of" is not.
   */
  spares: false,
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
