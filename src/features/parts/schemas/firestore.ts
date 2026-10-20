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

  // The 39 added 2026-10-20. Labels are the wiki's own `Classification=`
  // spelling, which is also what a buyer sees printed in product listings.
  "gt-chip": "GT Chip",
  "gatinko-chip": "Gatinko Chip",
  base: "Layer Base",
  "superking-chip": "Superking Chip",
  "db-core": "DB Core",
  ring: "Layer Ring",
  "armor-tip": "Armor Tip",
  frame: "Frame",
  chassis: "Chassis",
  "bu-blade": "BU Blade",
  "qs-blade": "QS Blade",
  "drive-chip": "Drive Chip",
  "storm-chip": "Storm Chip",
  "strike-chip": "Strike Chip",
  "gravity-ring": "Gravity Ring",
  "spirit-shield": "Spirit Shield",
  "spirit-axle": "Spirit Axle",
  "disc-integrated-driver": "Disc-Integrated Driver",
  "lock-chip": "Lock Chip",
  "main-blade": "Main Blade",
  "assist-blade": "Assist Blade",
  "over-blade": "Over Blade",
  "metal-blade": "Metal Blade",
  "ratchet-integrated-blade": "Ratchet-Integrated Blade",
  "ratchet-integrated-bit": "Ratchet-Integrated Bit",
  "warrior-wheel": "Warrior Wheel",
  "element-wheel": "Element Wheel",
  "light-wheel": "Light Wheel",
  wheel: "Wheel",
  "shogun-face-bolt": "Shogun Face Bolt",
  "dome-spin-track": "Dome Spin Track",
  "evolution-gear": "Evolution Gear",
  "bit-protector": "Bit Protector",
  weight: "Weight",
  core: "Core",
  "support-parts": "Support Parts",
  "sub-attack-ring": "Sub Attack Ring",
  cew: "Customize Engine Weight",
  "gear-chip": "Gear Chip",
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
  "lock-chip": "category-x-custom-cx",
  "main-blade": "category-x-custom-cx",
  "assist-blade": "category-x-custom-cx",
  "over-blade": "category-x-custom-cx",
  "metal-blade": "category-x-custom-cx",
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
  "support-parts": "category-original-parts",
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
/**
 * How much a given spec value is to be trusted, in the corpus's own
 * vocabulary so nothing is lost in translation.
 *
 * `confirmed` — `FACT(PDB)`, verified against PlasticsDB's own part page, or
 *               a `[CONFIRMED CSn Case m]` citation in the case study.
 * `fact`      — a bare `FACT` tag, or a wiki infobox value.
 * `inferred`  — the source flags it as an inference.
 * `estimated` — the source marks it approximate. 🛑 A `~` in a COLUMN HEADER
 *               marks the whole column, which is how gen3/gen4 write it; a
 *               per-cell check alone would publish 300+ estimates as facts.
 */
export type PartSpecConfidence = "confirmed" | "fact" | "inferred" | "estimated";

/** One labelled specification row. */
export interface PartSpec {
  /** "Weight", "Material", "Full width", "Stats", "WBO legality". */
  label: string;
  /** Verbatim from the source. Multi-valued cells are never resolved. */
  value: string;
  /** "g", "mm". Absent for a non-dimensional value. */
  unit?: string;
  /** Which extractor produced it, for the provenance footnote. */
  source?: string;
  confidence?: PartSpecConfidence;
}

/** One release of a part: which box, which bey, which vendor, which colour. */
export interface PartRelease {
  /** "Takara Tomy", "Hasbro", "Sonokong", "Youngtoys". */
  vendor: string;
  /** The box code. `BX-00` is the wiki's marker for "no retail number". */
  code?: string;
  /** The Beyblade it came in. */
  bey: string;
  /** The set or multipack, when the bey shipped inside one. */
  set?: string;
  colourway?: string;
  /** "G1 Prize", "CoroCoro Exclusive" — the channel, not the colour. */
  distribution?: string[];
}

/** A distinct colourway, deduped on (colour, channel). */
export interface PartColourway {
  /** "Red Ver.", "Bronze Ver.", "Supreme Dragon Ver.". */
  colourway: string;
  vendor: string;
  code?: string;
  distribution?: string;
  /** The bey this colourway was released in. */
  inBey: string;
}

/**
 * The infobox stat grid, as NUMBERS.
 *
 * 🛑 This is a deliberate second representation of the `Stats` row in
 * `specs[]`, not a mirror to keep in sync. The row is a RENDERING — one line,
 * because six rows of single digits crowd out every real specification on a
 * part page — and this is the VALUE, which is what a sort, a filter, a
 * side-by-side comparison and the simulation all need. Neither can do the
 * other's job, and both are produced by one parse in one pass, so there is no
 * second write path to forget (unlike Root Cause #42's shape).
 *
 * Every key is OPTIONAL because the source states them per part: a page that
 * gives Attack and Burst and nothing else yields exactly those two. A missing
 * key is "not stated", never zero — `weight: 0` is a real rating on a
 * featherweight disc and must stay distinguishable from silence.
 *
 * The scale is 0–6 and is the wiki's own editorial judgement, not a
 * measurement. It is useful for comparison between parts of the same slot and
 * should not be presented as a physical quantity.
 */
export interface PartRatings {
  attack?: number;
  defense?: number;
  stamina?: number;
  weight?: number;
  speed?: number;
  burst?: number;
  /*
   * 🛑 These five are on a DIFFERENT SCALE from the six above. `Bit - Accel`
   * reads Dash 40 and Burst resistance 80 — 0-100 — while attack/defense/etc.
   * are 0-6. They are stored as stated rather than normalised: rescaling would
   * invent precision the source never gave, and a value is still comparable
   * against other parts of the same slot, which is what a rating is for.
   */
  dash?: number;
  burstResistance?: number;
  power?: number;
  height?: number;
  runTime?: number;
}

/**
 * WBO tournament-format legality.
 *
 * 🛑 A format the source does not rule on is ABSENT, never `false`. Three
 * states exist — legal, banned, and not stated — and collapsing the third into
 * the second would publish "banned in Burst Classic" as a fact about every
 * part whose page simply never mentions Burst Classic.
 */
export interface PartWboLegality {
  burst?: boolean;
  burstGt?: boolean;
  burstLimited?: boolean;
  burstClassic?: boolean;
  /*
   * 🛑 Reading only the Burst four left every Beyblade X part reporting NO
   * legality — 286 pages — which renders identically to "not tournament
   * legal". Adding these took coverage from 999 rows to 1,380.
   */
  xStandard?: boolean;
  xMasters?: boolean;
  xOpen?: boolean;
  mfbStandard?: boolean;
  mfbLimited?: boolean;
  mfbZeroG?: boolean;
  mfb4d?: boolean;
}

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
  /** Code, name and the spoken form of the code. */
  aliases?: string[];
  /** Which extractor source contributed the row. */
  source?: string;

  /*
   * ── I10 — what the wiki re-crawl added, 2026-10-20 ───────────────────────
   *
   * Before this, a part page showed a name, a `code` badge and a weight that
   * 87% of rows did not have. The 2026-05 crawl had fetched ZERO per-part
   * pages for the legacy slots, so "fandom has no legacy parts" was a fact
   * about that crawl rather than about the wiki: the live `Category:Parts`
   * carries 2,261 English pages with `Weight=` on 2,023 of them.
   */

  /**
   * Labelled specification rows, ready to render.
   *
   * 🛑 ONE array rather than a dozen typed fields. Material, dimensions, spin
   * direction, JP name, romaji, product code, release date, WBO legality and
   * the 0–6 stat grid all render as "a labelled row" and none has a query, a
   * sort, a filter or a format of its own. Twelve typed fields would be twelve
   * projection-triage entries for zero behaviour; promote one the day a reader
   * is named for it.
   *
   * 🛑 NEVER carries a `Weight` row when `weightG` is set. The page renders
   * the weight as a badge, so a row too would show it twice and the two could
   * disagree the moment either is edited. The generator enforces this and
   * `verify-part-specs` asserts it.
   */
  specs?: PartSpec[];

  /**
   * One sentence per part, generated from the facts above.
   *
   * 🛑 GENERATED, NEVER COPIED. Every source page has an `== Description ==`
   * section and lifting it is both a CC-BY-SA problem and the precise
   * anti-pattern the competitor crawl recorded of a rival store — wiki bodies
   * lifted verbatim, one shipping with the literal UI string "Add to
   * Wishlist". What this replaces is worse than nothing SEO-wise: a template
   * reading "{name} is a Beyblade {label}. See which models use it", identical
   * across 752 pages, which made them compete with each other.
   */
  seoDescription?: string;

  /**
   * Which Beyblades and sets this part shipped in, first-seen order.
   *
   * Distinct from `usedBy`, and both are worth having: `usedBy` holds
   * `modelComposition` IDS that resolve to our own category leaves, while this
   * holds the wiki's PRODUCT names including sets and multipacks we have no
   * leaf for. 10,723 references extracted across 2,008 pages.
   */
  shippedIn?: string[];

  /** The per-release rows `shippedIn` and `colourways` are derived from. */
  releases?: PartRelease[];

  /**
   * Colourways, with the channel each was released through.
   *
   * 🛑 Absent and empty mean different things. Absent = "we have not looked";
   * `[]` with `colourwaysDocumented: true` = "a source asserts there are
   * none". Without that distinction a part with one release and a part we
   * never checked render identically, which is Root Cause #57's exact symptom.
   */
  colourways?: PartColourway[];
  colourwaysDocumented?: boolean;

  /**
   * A mould revision changes the physical part — weight, burst resistance — so
   * it is a DIFFERENT axis from colour and must not be folded into it.
   */
  hasMoldVariations?: boolean;
  /**
   * The 0–6 stat grid as numbers. Present on 1,149 of 2,490 rows — the source
   * states it per part, so absence is "not stated", not zero.
   */
  ratings?: PartRatings;
  /**
   * The ceiling `ratings` are out of — 6, 8 or 100.
   *
   * 🛑 LOAD-BEARING, because each generation rates on its own scale and they
   * share these fields. Measured: Beyblade X rates 0-100 (237 rows) while
   * Burst rates 0-6 or 0-8 (945 rows), so mean `attack` by slot reads
   * `blade 31.8` beside `driver 1.78`. Anything that sorts, compares or
   * simulates on a rating MUST divide by this first; without it a Beyblade X
   * blade outranks every Burst layer five times over.
   *
   * Derived per system from the highest rating observed for it, rounded up to
   * a standard step — not from a hand-written table, which was wrong within
   * one run (`warrior-wheel--dragoon` carries attack 7 against a declared 6).
   */
  ratingScale?: number;
  /**
   * The same axes rescaled to 0-100, so a part can be compared ACROSS
   * generations — which the game needs, since it has cross-gen battles.
   *
   * 🛑 This equalises the EDITORIAL JUDGEMENT, not the capability. A Burst
   * layer at 6/6 and a Beyblade X blade at 100/100 both land on 100 and are
   * not equally strong — that blade is 30 g against the layer's 13 g. So it
   * answers "how good is this part for its generation", which is the right
   * basis for a balanced roster and the wrong basis for claiming physical
   * equivalence. `weightG` carries the latter, in grams, unnormalised.
   *
   * `ratings` stays raw beside it: a normalised value can be recomputed from
   * the raw pair, a discarded raw value cannot.
   *
   * 🛑 FOR COMPARING OPPONENTS, NEVER FOR SUGGESTING A BUILD. A bey can only
   * be ASSEMBLED within one generation — a Burst layer does not fit a Beyblade
   * X ratchet — while battles are cross-generation. So this field belongs in a
   * matchup, a leaderboard or a side-by-side, and a "build your own" picker
   * must constrain to a single system's stack regardless of what it says.
   */
  ratingsNormalised?: PartRatings;
  /** WBO format legality across 11 formats; an unstated format is absent. */
  wboLegality?: PartWboLegality;
  /**
   * Other names for this exact part — the community abbreviation (`Armor Tip
   * - Adventure` is `Ad`) and the other vendor's name. On 1,072 of 2,490 rows.
   * Feeds search, so a buyer can find a part by the code printed on it.
   */
  aka?: string[];
  /**
   * Hasbro's own product code, a SEPARATE field from `productCodes`. On 309
   * rows, and it is the Hasbro <-> Takara-Tomy equivalence stated outright.
   */
  hasbroCode?: string;
  /** Attack / Defense / Stamina / Balance, per part. 793 rows. */
  partType?: string;
  /** Right-Spin / Left-Spin / Dual. 756 rows. */
  spinDirection?: string;
  /** Beyblade X's attribute label — "Sky" and siblings. 29 rows. */
  element?: string;
  /**
   * The character this part belongs to in the story — `Bit Chip - Black
   * Dranzer` is Kai Hiwatari's. Only 27 rows, but it is the sole place a PART
   * is tied to a character.
   */
  owner?: string;
  /** The episode this part appeared in. 22 rows. */
  appearAnime?: string;
  /**
   * The Japanese name, the romanisation, and the kanji where the source gives
   * one.
   *
   * 🛑 Top-level fields AS WELL AS `specs[]` rows, which is not duplication for
   * its own sake: a `<title>`, an `og:title`, an hreflang alternate and a
   * JSON-LD `alternateName` all need a FIELD. None of them can scan an array
   * of label/value pairs for one whose label happens to read "Japanese name",
   * and that is where these 1,068 values previously lived and died.
   */
  jpName?: string;
  romaji?: string;
  kanjiName?: string;

  /** `/media/<slug>`. 🛑 Never a raw Storage host URL. */
  image?: string;
  /** The wiki page the photo came from — the CC-BY-SA attribution target. */
  imageSourceUrl?: string;
  /** "Read more on the Beyblade Wiki". Facts taken, prose theirs, link out. */
  sourceUrl?: string;
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
