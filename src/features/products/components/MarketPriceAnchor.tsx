import { PRICE_INDEX_MIN_CONFIDENT_SAMPLES, type PriceIndexBand } from "../../categories/repository/price-index.repository";
import { formatCurrency } from "../../../utils/number.formatter";
import { PricesOnly } from "../../../ui/components/GatedPrice";
import { Text } from "../../../ui/components/Typography";

export interface MarketPriceAnchorProps {
  /** The band for this leaf AND this listing type, or null when there is none. */
  band: PriceIndexBand | null | undefined;
  /** Days of completed sales the band covers — stated, never implied. */
  windowDays: number | null | undefined;
  currency?: string;
  /** This listing's own price, so the comparison can be stated as a direction. */
  price?: number | null;
}

/**
 * H2 — the one persuasion pattern on this site that is made of measurement.
 *
 * ## 🛑 Why an anchor at all, and why THIS anchor
 *
 * Price anchoring works; the usual implementation is a fabricated "RRP ₹2,499"
 * beside a ₹1,299 price, and in this market it is close to universal. It is
 * also a lie, and the plan's H2 boundary is explicit that a persuasion pattern
 * here has to be a true statement a visitor could verify.
 *
 * This one is: **what this model has actually sold for on this site**, from
 * `priceIndexRollup`'s realised-sale bands. A seller can check it against their
 * own completed orders and a buyer can click through to the tool that shows the
 * distribution. Nothing is invented and nothing is rounded in our favour.
 *
 * ## 🛑 Three rules that keep it honest
 *
 * 1. **Silent below `PRICE_INDEX_MIN_CONFIDENT_SAMPLES`.** A median of two
 *    sales is arithmetic, not a market. The tool page says "not enough data
 *    yet" because that is a legitimate answer to a direct question; a product
 *    page says NOTHING, because an unasked-for caveat beside a buy button is
 *    noise rather than information.
 * 2. **The window is stated.** "over 90 days" is part of the claim — a median
 *    with no period attached is unfalsifiable.
 * 3. **The direction is stated plainly, including when it is unflattering.**
 *    If this listing is ABOVE what the model usually sells for, it says so. An
 *    anchor that only ever renders when it flatters the price is a filter, not
 *    a measurement, and a buyer who notices that once never believes the
 *    number again.
 *
 * 🛑 Wrapped in `<PricesOnly>`: it is a SECONDARY money figure beside an
 * already-gated price, so a signed-out visitor sees nothing rather than a
 * second "sign in to see price" (CLAUDE.md § Guest price gating).
 */
export function MarketPriceAnchor({
  band,
  windowDays,
  currency = "INR",
  price,
}: MarketPriceAnchorProps) {
  if (!band) return null;
  if (!band.sampleSize || band.sampleSize < PRICE_INDEX_MIN_CONFIDENT_SAMPLES) return null;
  if (!Number.isFinite(band.median) || band.median <= 0) return null;

  const window = typeof windowDays === "number" && windowDays > 0 ? windowDays : null;
  const sales = `${band.sampleSize} sale${band.sampleSize === 1 ? "" : "s"}`;
  const period = window ? ` in the last ${window} days` : "";

  /*
   * The direction, computed against a 5% band so a rounding difference is not
   * reported as "above the usual price". Below that threshold the line states
   * the median and claims nothing about this listing.
   */
  const delta =
    typeof price === "number" && price > 0 ? (price - band.median) / band.median : null;
  const direction =
    delta === null || Math.abs(delta) < 0.05
      ? null
      : delta < 0
        ? "below"
        : "above";

  return (
    <PricesOnly>
      <Text size="xs" color="muted" className="mt-1">
        {`Sold here for a median of ${formatCurrency(band.median, currency)} — ${sales}${period}`}
        {direction === "below" && ", so this one is under the usual price"}
        {direction === "above" && ", so this one is above the usual price"}
      </Text>
    </PricesOnly>
  );
}
