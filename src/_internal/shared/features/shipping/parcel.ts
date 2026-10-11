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
