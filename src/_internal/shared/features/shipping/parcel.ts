/**
 * The parcel a shipment is quoted and booked on — C5a.
 *
 * ## 🛑 Three tiers, and the distinction between them is the whole point
 *
 *   CATEGORY   `CategoryProductDefaults.weightG` / `dimensionsCm` — a PACKED
 *              figure, seeded per leaf. Drives the checkout ESTIMATE.
 *   PRODUCT    `ProductDocument.weightG` / `dimensionsCm` — OPTIONAL. Refines
 *              the estimate when a seller has actually weighed a packed box.
 *   SHIPMENT   entered by the seller at booking time. **What is booked.**
 *
 * The figure a carrier bills on is the packed parcel, not the item: a bey is
 * ~30 g and ~300 g boxed. A required product weight would therefore be an item
 * weight that systematically under-estimates every booking — and since the
 * booking is capped at the amount collected from the buyer, systematic
 * under-estimation means silently absorbing the difference on every order.
 *
 * So the seller enters the real number when they have the box in front of
 * them, and the category default exists only to quote with before that exists.
 *
 * ## 🛑 And the estimate must never silently become zero
 *
 * A missing weight cannot resolve to `0` — a carrier rate for a 0 g parcel is
 * either an error or the cheapest band, and the cheapest band is the one that
 * loses money. `resolveParcel` returns `null` when nothing is known, and every
 * caller has to decide what to do about it rather than being handed a number
 * that looks usable.
 *
 * Pure. No Firestore, no React.
 */

/** A dimension triple, all three or nothing — see `normaliseDimensions`. */
export interface ParcelDimensionsCm {
  l: number;
  w: number;
  h: number;
}

export interface Parcel {
  weightG: number;
  dimensionsCm?: ParcelDimensionsCm;
  /**
   * Which tier supplied the weight, so a surface can say so.
   *
   * Carried because "₹140 estimated" and "₹140 estimated from the category's
   * typical packed weight, because this listing has none" are different claims,
   * and the second is the honest one most of the time.
   */
  source: "shipment" | "product" | "category";
}

/** What a product or category can offer. Structural, so either shape fits. */
export interface ParcelSource {
  weightG?: number | null;
  dimensionsCm?: { l?: number | null; w?: number | null; h?: number | null } | null;
}

/**
 * All three dimensions or none.
 *
 * A box with a length and no width is not a dimension — a carrier's volumetric
 * calculation needs the triple, and feeding it two of three yields either an
 * error or a quote for a flat sheet. The product form and the admin editor
 * both enforce this at input; this is the read-side twin so a document written
 * before they did cannot leak a partial triple into a rate request.
 */
export function normaliseDimensions(
  d: ParcelSource["dimensionsCm"],
): ParcelDimensionsCm | undefined {
  if (!d) return undefined;
  const l = Number(d.l ?? 0);
  const w = Number(d.w ?? 0);
  const h = Number(d.h ?? 0);
  if (!(l > 0 && w > 0 && h > 0)) return undefined;
  return { l, w, h };
}

/**
 * Resolve the parcel to quote on, most specific tier first.
 *
 * 🛑 Returns `null` rather than a zero-weight parcel when no tier supplies a
 * weight. A caller must then either refuse to quote or fall back to a
 * non-carrier shipping mode — both of which are visible decisions, where a
 * `0` would have been an invisible one.
 *
 * Dimensions are resolved INDEPENDENTLY of the weight, because the two are
 * declared independently: a seller who typed a weight and no box size should
 * still get the category's box size rather than none. Taking both from
 * whichever tier won on weight would discard information that exists.
 */
export function resolveParcel(
  shipment: ParcelSource | null | undefined,
  product: ParcelSource | null | undefined,
  category: ParcelSource | null | undefined,
): Parcel | null {
  const tiers: Array<[Parcel["source"], ParcelSource | null | undefined]> = [
    ["shipment", shipment],
    ["product", product],
    ["category", category],
  ];

  let weightG: number | null = null;
  let source: Parcel["source"] | null = null;
  for (const [name, t] of tiers) {
    const w = t?.weightG;
    if (typeof w === "number" && w > 0) {
      weightG = w;
      source = name;
      break;
    }
  }
  if (weightG == null || source == null) return null;

  let dimensionsCm: ParcelDimensionsCm | undefined;
  for (const [, t] of tiers) {
    const d = normaliseDimensions(t?.dimensionsCm);
    if (d) {
      dimensionsCm = d;
      break;
    }
  }

  return { weightG, source, ...(dimensionsCm ? { dimensionsCm } : {}) };
}

/* ── Volumetric weight — what the carrier actually bills ──────────────────── */

/**
 * Divisors, by service class.
 *
 * A carrier sells space, not mass, so it bills the greater of actual weight and
 * `l × w × h ÷ divisor`. The divisor is the whole ballgame on this catalogue:
 * collectible packaging is mostly air, so for a stadium box the volumetric
 * figure is ~5× the actual and no per-kilo negotiation touches it.
 *
 * 🛑 `surfaceTight` is not a typo. Some Indian surface B2C plans quote ÷4000,
 * which is a silent 25% increase over ÷5000 on every bulky parcel and is
 * never the number on the front of the rate card. Read the contract, then set
 * this per carrier — do not assume 5000 because it is the common default.
 *
 * Air uses a LARGER divisor, which means a very light bulky box can genuinely
 * cost less by air than by surface. That is counter-intuitive and real.
 */
export const VOLUMETRIC_DIVISORS = {
  surfaceTight: 4000,
  standard: 5000,
  air: 6000,
} as const;

export const DEFAULT_VOLUMETRIC_DIVISOR = VOLUMETRIC_DIVISORS.standard;

/**
 * Where a parcel sits against the two thresholds, and therefore which carrier
 * class is cheaper. See `carrierClassFor` for why these numbers.
 */
export const VOLUMETRIC_RATIO_THRESHOLDS = {
  /** Below this the two weights are close enough that the rate card decides. */
  private: 1.5,
  /** At or above this the box is mostly air and a postal service wins. */
  postal: 2,
} as const;

/**
 * The first billing slab, in grams — the region where R means nothing.
 *
 * 🛑 This guard exists because the ratio rule is WRONG below it, and the error
 * was caught by checking the rule against real tariffs instead of trusting it.
 *
 * A single boxed bey is 250 g actual / 448 g volumetric — R 1.79, which the
 * thresholds above call `"either"`. The real bill at >2000 km is ₹106 by Speed
 * Post against ₹50 by private courier: private wins by 2×, not "either".
 *
 * The reason is that both figures land inside each carrier's MINIMUM charge, so
 * the comparison is floor against floor and the ratio describes nothing. India
 * Post's 201–500 g floor is ₹90; a private first slab is around ₹42. Whenever
 * both weights sit in that first slab, the lower floor wins and that is private.
 */
export const FIRST_SLAB_G = 500;

export interface ChargeableWeight {
  actualG: number;
  /**
   * `null` when the dimension triple is unknown — NEVER 0.
   *
   * A carrier with no dimensions bills actual weight, so `chargeableG` is still
   * correct in that case. But a `0` here would read as "this box has no volume",
   * and `ratio` would compute to 0, which routes a stadium to the private
   * carrier that bills it at 7.3 kg. Unknown has to stay distinguishable from
   * dense — same discipline as `resolveParcel` refusing to return weight 0.
   */
  volumetricG: number | null;
  /** `max(actual, volumetric)` — what you are billed for. */
  chargeableG: number;
  divisor: number;
  billedOn: "actual" | "volumetric";
  /**
   * **The R value**: volumetric ÷ actual, 2dp. `null` without dimensions.
   *
   * 1 means the box is exactly at the divisor's break-even density. Above 1 you
   * are paying for air; below 1 the volume is free and actual weight bills.
   */
  ratio: number | null;
  /** Packed density in kg/m³. `null` without dimensions. */
  densityKgM3: number | null;
  /**
   * The density at which volumetric starts to bite, derived from the divisor
   * rather than hardcoded: `1e6 / divisor`. 200 kg/m³ at ÷5000, 250 at ÷4000,
   * ~167 at ÷6000. A parcel below this is billed on volume.
   */
  breakEvenKgM3: number;
}

/** Volumetric weight in grams. `l × w × h ÷ divisor` is kilos, hence ×1000. */
export function volumetricWeightG(
  d: ParcelDimensionsCm,
  divisor: number = DEFAULT_VOLUMETRIC_DIVISOR,
): number {
  if (!(divisor > 0)) {
    throw new RangeError(`volumetricWeightG: divisor must be > 0, got ${divisor}`);
  }
  return Math.round(((d.l * d.w * d.h) / divisor) * 1000);
}

/**
 * What this parcel is billed at, and by how much volume beats mass.
 *
 * Pure arithmetic — it reports, it does not decide. `carrierClassFor` turns the
 * result into a routing opinion, deliberately as a separate step so a surface
 * can show the numbers without adopting the recommendation.
 */
export function chargeableWeight(
  parcel: Pick<Parcel, "weightG" | "dimensionsCm">,
  divisor: number = DEFAULT_VOLUMETRIC_DIVISOR,
): ChargeableWeight {
  const actualG = parcel.weightG;
  const breakEvenKgM3 = Math.round((1_000_000 / divisor) * 10) / 10;
  const d = parcel.dimensionsCm;

  if (!d) {
    return {
      actualG,
      volumetricG: null,
      chargeableG: actualG,
      divisor,
      billedOn: "actual",
      ratio: null,
      densityKgM3: null,
      breakEvenKgM3,
    };
  }

  const volumetricG = volumetricWeightG(d, divisor);
  const cm3 = d.l * d.w * d.h;
  return {
    actualG,
    volumetricG,
    chargeableG: Math.max(actualG, volumetricG),
    divisor,
    billedOn: volumetricG > actualG ? "volumetric" : "actual",
    ratio: actualG > 0 ? Math.round((volumetricG / actualG) * 100) / 100 : null,
    densityKgM3: cm3 > 0 ? Math.round(((actualG * 1000) / cm3) * 10) / 10 : null,
    breakEvenKgM3,
  };
}

/**
 * Which carrier class is cheaper for this parcel, on freight alone.
 *
 * India Post Speed Post bills ACTUAL weight and applies no volumetric
 * calculation; every private carrier bills the greater of the two. So the
 * freight comparison reduces to the R value:
 *
 *   R < 1.5   the two weights are close; the rate card decides, and a private
 *             card is usually cheaper at low weight → `"private"`
 *   1.5 ≤ R < 2   genuinely close; decide on pincode serviceability and
 *             whether the item needs insurance → `"either"`
 *   R ≥ 2     the box is mostly air and postal is materially cheaper → `"postal"`
 *
 * 🛑 `"unknown"` when dimensions are missing, and callers must not collapse it
 * into a default. Defaulting to `"private"` is precisely the wrong way round:
 * the parcels whose dimensions nobody recorded are disproportionately the big
 * awkward ones, which are the parcels this function exists to divert.
 *
 * 🛑 This is a FREIGHT opinion and nothing more. Above roughly ₹8,000 of order
 * value the decision stops being about freight — the delta is a few hundred
 * rupees against an uninsured loss of the whole item — so an order-value test
 * and serviceability both outrank this. It answers "which is cheaper", never
 * "which should we book".
 *
 * ## Where it is weakest, stated rather than hidden
 *
 * At HIGH weight the per-additional-slab rates start to matter more than the
 * ratio, and those are negotiated. A 8 kg / 14 kg parcel is R 1.75 → `"either"`,
 * while one representative card puts it at ₹991 postal against ₹1,197 private —
 * a real 21% gap the ratio does not see. `"either"` is the honest answer there:
 * it means your own card decides, not that the two are equal.
 */
export function carrierClassFor(
  c: Pick<ChargeableWeight, "ratio" | "actualG" | "volumetricG">,
): "private" | "either" | "postal" | "unknown" {
  if (c.ratio == null) return "unknown";

  // Both weights inside the first slab → floor vs floor; see FIRST_SLAB_G.
  if (
    c.actualG <= FIRST_SLAB_G &&
    c.volumetricG != null &&
    c.volumetricG <= FIRST_SLAB_G
  ) {
    return "private";
  }

  if (c.ratio >= VOLUMETRIC_RATIO_THRESHOLDS.postal) return "postal";
  if (c.ratio >= VOLUMETRIC_RATIO_THRESHOLDS.private) return "either";
  return "private";
}

/**
 * The weight of a whole order group — what a single shipment actually carries.
 *
 * Summed across lines and multiplied by live quantity, because a carrier
 * quotes one parcel per shipment and two beys in one box weigh more than one.
 *
 * 🛑 Returns `null` if ANY line has no resolvable weight, rather than summing
 * the ones it knows. A partial sum is a confident under-estimate, which is the
 * exact failure this module exists to prevent — and it is worse than no
 * estimate, because no estimate is visible.
 */
export function resolveGroupWeightG(
  lines: ReadonlyArray<{ quantity: number; parcel: Parcel | null }>,
): number | null {
  let total = 0;
  for (const line of lines) {
    if (!line.parcel) return null;
    const qty = Math.max(1, line.quantity);
    total += line.parcel.weightG * qty;
  }
  return total > 0 ? total : null;
}

/**
 * Actual against estimated, recorded and NEVER blended.
 *
 * Same discipline as the price index's market-vs-sold pair, for the same
 * reason: the estimate is what we charged the buyer and the actual is what the
 * carrier billed, and **the gap is the thing worth watching**. A leaf whose
 * actuals run consistently over its default is telling us the default is
 * wrong, which is a report for a human — not an automatic correction, because
 * a default that chases its own actuals has no anchor.
 */
export interface ParcelWeightVariance {
  estimatedG: number;
  actualG: number;
  /** Positive means the real parcel was HEAVIER than quoted. */
  deltaG: number;
  /** Signed fraction of the estimate, rounded to 3dp. `null` if estimate is 0. */
  deltaRatio: number | null;
}

export function parcelWeightVariance(
  estimatedG: number,
  actualG: number,
): ParcelWeightVariance {
  const deltaG = Math.round((actualG - estimatedG) * 1000) / 1000;
  return {
    estimatedG,
    actualG,
    deltaG,
    deltaRatio:
      estimatedG > 0 ? Math.round((deltaG / estimatedG) * 1000) / 1000 : null,
  };
}
