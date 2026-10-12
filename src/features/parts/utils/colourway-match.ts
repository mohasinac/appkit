/*
 * WHY: one part code can be two physically different units that are not
 *      interchangeable. The user's case, and the fixture pair to build first:
 *
 *        performance-tip--mb  "Metal Ball"
 *          -> silver             ships with L-Drago Guardian S130MB (rare, costly)
 *          -> transparent-black  ships with Poison Zurafa S130MB
 *
 *      Same mould, same weight, same stats, same behaviour. To build an L-Drago
 *      you need the silver one; the black one will not do. Same for their S130
 *      tracks.
 *
 * WHAT: the ONE predicate for "does this part listing satisfy this composition
 *       slot". Pure, so the case above is assertable without a database.
 *
 * EXPORTS: normaliseColourway, satisfiesSlot, matchSlotToHoldings
 *
 * ── 🛑 WHY THIS IS A SEPARATE MODULE AND NOT AN INLINE `===` ───────────────
 *
 * Because it will be needed in at least three places that must agree — the
 * "buildable now" rollup, the assembly drawer's per-slot picker, and (once it
 * bands by colourway) the price index. An inline comparison is Root Cause #75's
 * shape: the copy made before a rule was added never learns about it, and the
 * rule here has two non-obvious halves (unset means ANY, and comparison is
 * normalised).
 *
 * @tag domain:parts
 * @tag layer:util
 * @tag pattern:none
 * @tag access:shared
 * @tag consumers:buildable-now rollup, assembly drawer, priceIndexRollup
 * @tag sideEffects:none
 */

/**
 * Compare colourways the way a human would type them.
 *
 * 🛑 The vocabulary is OPEN-ENDED and seller-entered — deliberately not a
 * `productFeature`, because that vocabulary is ~169 curated terms in 14 groups
 * and colourways are per-part, which would give a facet hundreds of single-use
 * values (the long-tail-tag anti-pattern this project rejected when redeyemerch
 * was crawled).
 *
 * Open-ended means "Transparent Black", "transparent-black" and
 * "transparent black" are the same colour typed three ways, and a strict `===`
 * would call a buildable bey unbuildable. Normalising is not a nicety here; it
 * is the difference between a working rollup and one that reports nothing.
 */
export function normaliseColourway(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface SlotRequirement {
  /** The `partGlossary` id the slot needs. */
  partId?: string;
  /** The colourway it needs. Absent means ANY colourway will do. */
  expectedColourway?: string;
}

export interface PartHolding {
  /** The part listing's own product id. */
  productId: string;
  partGlossaryId?: string;
  colourway?: string;
  /**
   * 🛑 AVAILABLE, never `stockQuantity`. 10 in stock with 3 reserved is SEVEN
   * assemblable, and building from the wrong field assembles a bey out of parts
   * somebody has already bought — A4's bug through a new door.
   */
  availableQuantity: number;
}

/**
 * Does this holding satisfy that slot?
 *
 * Two rules, and the second is the one that gets written wrong:
 *
 *   1. the glossary id must match — a Driver is not a Bit;
 *   2. the colourway must match **when the slot names one**. 🛑 A slot with no
 *      `expectedColourway` accepts ANY, including a holding that declares one.
 *      The reverse — a slot that names a colour accepting a holding that
 *      declares none — is REFUSED, because "colour unknown" is not evidence of
 *      the right colour, and this is exactly where a cheerful default produces
 *      the wrong physical part.
 */
export function satisfiesSlot(slot: SlotRequirement, holding: PartHolding): boolean {
  if (!slot.partId) return false;
  if (holding.partGlossaryId !== slot.partId) return false;
  if (holding.availableQuantity <= 0) return false;

  const want = normaliseColourway(slot.expectedColourway);
  if (!want) return true; // the slot is colour-agnostic
  return normaliseColourway(holding.colourway) === want;
}

export interface SlotMatch {
  slot: SlotRequirement;
  /** Every holding that satisfies the slot, richest first. */
  candidates: PartHolding[];
  /** How many complete units this slot alone could supply. */
  buildable: number;
}

/**
 * Match one slot against what a seller holds.
 *
 * `buildable` is the SUM across candidates, because two listings of the same
 * part in the same colourway are two piles of the same thing — a seller with
 * 2 silver MBs in one listing and 3 in another can build five.
 */
export function matchSlotToHoldings(
  slot: SlotRequirement,
  holdings: readonly PartHolding[],
): SlotMatch {
  const candidates = holdings
    .filter((h) => satisfiesSlot(slot, h))
    .sort((a, b) => b.availableQuantity - a.availableQuantity);
  return {
    slot,
    candidates,
    buildable: candidates.reduce((sum, h) => sum + h.availableQuantity, 0),
  };
}
