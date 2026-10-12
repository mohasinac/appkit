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
