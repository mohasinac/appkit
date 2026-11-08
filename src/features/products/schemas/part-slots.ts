/**
 * Part slots and composition flags — the SHOP's share of the old parts schema.
 *
 * The bey/part reference taxonomy left the shop on 2026-11-08 (owner decision:
 * the wiki owns it as JSON and will expose an API, the way it already does for
 * tools). These three symbols did NOT go with it, because they are not
 * taxonomy — they are product concerns that outlive the reference pages:
 *
 *   PART_SLOT_VALUES / PartSlot   a `spares` listing still has a slot
 *   PART_SLOT_CATEGORY            the price index maps a slot to its leaf
 *   LISTING_TYPE_HAS_COMPOSITION  category assignment still asks the question
 *
 * Kept as a `Record<PartSlot, …>` for the reason the original gave: a new slot
 * is a COMPILE ERROR rather than a page heading that reads `performance-tip`.
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

  /*
   * ── 🛑 THE OTHER 39, ADDED 2026-10-20 FROM THE WIKI RE-CRAWL ─────────────
   *
   * The original 20 predate Gatinko, Sparking, Dynamite Battle, QuadDrive,
   * QuadStrike, Burst Ultimate and the whole Beyblade X Custom line. These are
   * not wiki noise — `case study/BEYBLADE MASTER REFERENCE.md` documents the
   * STACK of each system, and every key below is a slot in one of them:
   *
   *   GT / Gatinko  GT Chip -> Layer Base -> Forge Disc -> Driver
   *   SK / Sparking  Sparking Chip -> Layer Base -> Forge Disc -> Driver
   *   DB             DB Core -> Armor -> Layer Ring -> Forge Disc -> Driver
   *   CX             Lock Chip + Main Blade + Assist Blade -> Ratchet -> Bit
   *   CX Expand      Lock Chip + Over Blade + Metal Blade + Assist Blade -> …
   *
   * Measured: the live `Category:Parts` holds 2,261 English pages against our
   * 752 rows, and 569 of them carried a classification this union could not
   * express — so they were unrepresentable rather than merely absent.
   *
   * 🛑 MAPPED, NOT DUPLICATED. `Forge Disc` is `disc`, `Armor` is `armour`,
   * `Energy Layer` is `layer`, `Layer Base` is `base`, `Sparking Chip` is
   * `superking-chip`. A second key for any of them would split one part
   * family in half: the existing 752 rows in one, every new row in the other.
   * The alias map lives in `scripts/lib/part-slot-vocab.mjs`, which is the
   * SOURCE this union mirrors — the same contract the 20 above already have
   * with `extract-part-composition.mjs`.
   */
  GT_CHIP: "gt-chip",
  GATINKO_CHIP: "gatinko-chip",
  BASE: "base",
  SUPERKING_CHIP: "superking-chip",
  DB_CORE: "db-core",
  RING: "ring",
  ARMOR_TIP: "armor-tip",
  FRAME: "frame",
  CHASSIS: "chassis",
  BU_BLADE: "bu-blade",
  QS_BLADE: "qs-blade",
  DRIVE_CHIP: "drive-chip",
  STORM_CHIP: "storm-chip",
  STRIKE_CHIP: "strike-chip",
  GRAVITY_RING: "gravity-ring",
  SPIRIT_SHIELD: "spirit-shield",
  SPIRIT_AXLE: "spirit-axle",
  DISC_INTEGRATED_DRIVER: "disc-integrated-driver",
  LOCK_CHIP: "lock-chip",
  MAIN_BLADE: "main-blade",
  ASSIST_BLADE: "assist-blade",
  OVER_BLADE: "over-blade",
  METAL_BLADE: "metal-blade",
  RATCHET_INTEGRATED_BLADE: "ratchet-integrated-blade",
  RATCHET_INTEGRATED_BIT: "ratchet-integrated-bit",
  WARRIOR_WHEEL: "warrior-wheel",
  ELEMENT_WHEEL: "element-wheel",
  LIGHT_WHEEL: "light-wheel",
  WHEEL: "wheel",
  SHOGUN_FACE_BOLT: "shogun-face-bolt",
  DOME_SPIN_TRACK: "dome-spin-track",
  EVOLUTION_GEAR: "evolution-gear",
  BIT_PROTECTOR: "bit-protector",
  WEIGHT: "weight",
  CORE: "core",
  SUPPORT_PARTS: "support-parts",
  SUB_ATTACK_RING: "sub-attack-ring",
  CEW: "cew",
  GEAR_CHIP: "gear-chip",
} as const;

export type PartSlot = (typeof PART_SLOT_VALUES)[keyof typeof PART_SLOT_VALUES];

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

  /*
   * ── The 39 added 2026-10-20 ──────────────────────────────────────────────
   *
   * 🛑 EVERY TARGET ALREADY EXISTS IN `category-forest.ts`. Verified against
   * it rather than assumed: no new parent node is created here, so the forest
   * is untouched, `buildCategoryTree` derives the same shape it already does,
   * and the only change is which parent a part leaf nests under. Minting 39
   * new nodes would be a taxonomy restructure — and the parts layer is moving
   * out of categories in a follow-up plan anyway, so adding nodes to it now
   * would be churn with a known expiry.
   *
   * Grouped by what the part IS, not by when we learned about it: the Burst
   * chip/armour node already collects "small Burst component that is not a
   * layer, disc or driver", which is exactly what GT/Gatinko/Superking/DB/
   * QuadDrive chips are.
   */

  // Burst — layer stack components.
  base: "category-burst-layers",
  ring: "category-burst-layers",
  frame: "category-burst-layers",
  chassis: "category-burst-layers",
  "bu-blade": "category-burst-layers",
  "qs-blade": "category-burst-layers",
  "gravity-ring": "category-burst-layers",
  // Burst — chips, armour and the small bits that bolt onto a layer.
  "gt-chip": "category-burst-chips-armour",
  "gatinko-chip": "category-burst-chips-armour",
  "superking-chip": "category-burst-chips-armour",
  "db-core": "category-burst-chips-armour",
  "armor-tip": "category-burst-chips-armour",
  "drive-chip": "category-burst-chips-armour",
  "storm-chip": "category-burst-chips-armour",
  "strike-chip": "category-burst-chips-armour",
  "spirit-shield": "category-burst-chips-armour",
  "spirit-axle": "category-burst-chips-armour",
  weight: "category-burst-chips-armour",
  core: "category-burst-chips-armour",
  // Burst — a driver with the disc moulded in is still a driver.
  "disc-integrated-driver": "category-burst-drivers",

  // Beyblade X — the CX Custom line, which has its own node.
  "lock-chip": "category-x-lock-chips",
  "main-blade": "category-x-main-blades",
  "assist-blade": "category-x-assist-blades",
  "over-blade": "category-x-over-blades",
  "metal-blade": "category-x-metal-blades",
  "gear-chip": "category-x-custom-cx",
  // Beyblade X — integrated parts file under the half a buyer shops for.
  "ratchet-integrated-blade": "category-x-blades",
  "ratchet-integrated-bit": "category-x-bits",

  // Metal Fight / Shogun Steel.
  "warrior-wheel": "category-metal-fusion-wheels",
  "element-wheel": "category-metal-fusion-wheels",
  "light-wheel": "category-metal-fusion-wheels",
  wheel: "category-metal-fusion-wheels",
  "shogun-face-bolt": "category-metal-face-bolts",
  "dome-spin-track": "category-metal-spin-tracks",

  // Plastic Generation / HMS.
  "sub-attack-ring": "category-original-attack-rings",
  "evolution-gear": "category-original-engine-gears",
  "bit-protector": "category-original-bit-chips",
  cew: "category-original-weight-disks",
  "support-parts": "category-original-support-parts",
};

/**
 * Normalises a colourway for use as a grouping key in the price index.
 * Moved here with the slot constants for the same reason.
 */
export function normaliseColourway(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const LISTING_TYPE_HAS_COMPOSITION: Record<
  import("../../products/types/index").ListingType,
  boolean
> = {
  standard: true,
  "collector-drop": true,
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
  "clearance": true,
  classified: true,
  live: true,
  // Depicts the model; is not the model.
  "art-and-stickers": false,
  // A redemption code has no physical parts at all.
  "digital-code": false,
};
