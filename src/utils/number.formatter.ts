/**
 * Number Formatting Utilities
 */

import {
  getDefaultCurrency,
  getDefaultCurrencySymbol,
  getDefaultLocale,
} from "../core/baseline-resolver";

/**
 * Money for PROSE — notification bodies, error messages, log lines, chips.
 *
 * ## Why this exists beside `formatCurrency`
 *
 * 71 call sites interpolated a hardcoded symbol next to a bare number —
 * `` `Minimum offer is ₹${bounds.min}` `` — which is wrong three ways at once:
 * the symbol is baked in, the grouping is absent (`₹1000`, not `₹1,000`), and
 * ~20 more files reached for `toLocaleString("en-IN")` with the locale
 * hardcoded too. All three read from the market profile now, which the consumer
 * already configures via `configureMarketDefaults()`.
 *
 * ## 🛑 Why not just use `formatCurrency`
 *
 * `Intl.NumberFormat` with `style: "currency"` forces the currency's standard
 * fraction digits, so every whole amount becomes `₹1,000.00`. Rewriting 71
 * strings to add `.00` to prices, offers and refunds that have no paise is a
 * user-visible copy change dressed up as a refactor. This shows paise only when
 * they exist: `₹1,000` and `₹1,000.50`.
 *
 * `formatCurrency` keeps its job — the ISO-correct, locale-placed rendering for
 * tabular and formal surfaces (invoices, statements). Use that where the form
 * matters and this where the sentence does.
 */
export function formatMoney(amount: number, locale?: string): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  const grouped = new Intl.NumberFormat(resolvedLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  /*
   * Symbol then number, not `Intl`'s currency placement. These strings are
   * assembled into sentences that already read "₹500" in copy the team wrote,
   * and a locale whose convention is "1 000,00 ₹" would reorder mid-sentence.
   * A market that needs the symbol elsewhere overrides `currencySymbol`.
   */
  return `${getDefaultCurrencySymbol()}${grouped}`;
}

export function formatCurrency(
  amount: number,
  currency?: string,
  locale?: string,
): string {
  const resolvedCurrency = currency ?? getDefaultCurrency();
  const resolvedLocale = locale ?? getDefaultLocale();
  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency: resolvedCurrency,
  }).format(amount);
}

export function formatNumber(
  num: number,
  locale?: string,
  options?: { decimals?: number },
): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  return new Intl.NumberFormat(resolvedLocale, {
    minimumFractionDigits: options?.decimals,
    maximumFractionDigits: options?.decimals,
  }).format(num);
}

/** Rounds to 2 decimal places for rupee-denominated money math (avoids float drift). */
export function roundRupees(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatPercentage(num: number, decimals: number = 0): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) {
    const kValue = (num / 1000).toFixed(1);
    // Rounding can push a value right up to the next unit's boundary
    // (e.g. 999950 -> "1000.0K") — escalate instead of displaying "1000.0K".
    if (kValue === "1000.0") return `${(num / 1_000_000).toFixed(1)}M`;
    return `${kValue}K`;
  }
  if (num < 1_000_000_000) {
    const mValue = (num / 1_000_000).toFixed(1);
    if (mValue === "1000.0") return `${(num / 1_000_000_000).toFixed(1)}B`;
    return `${mValue}M`;
  }
  return `${(num / 1_000_000_000).toFixed(1)}B`;
}

export function formatDecimal(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function formatOrdinal(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = num % 100;
  return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}

export function parseFormattedNumber(str: string): number {
  const isNegative = /^-/.test(str) || str.includes("-");

  let cleaned = str.replace(/[^\d,.]/g, "");
  if (cleaned === "" || cleaned === "0") return 0;

  const lastCommaIndex = cleaned.lastIndexOf(",");
  const lastDotIndex = cleaned.lastIndexOf(".");
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;

  let decimalSeparator = ".";
  let thousandsSeparator = ",";

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
      decimalSeparator = ",";
      thousandsSeparator = ".";
    }
  } else if (lastDotIndex > -1 && lastCommaIndex === -1) {
    const afterDot = cleaned.substring(lastDotIndex + 1);
    // A single separator followed by exactly 3 digits is the standard
    // thousands-grouping width (e.g. "3.500" -> 3500), not a decimal — only
    // 1-2 trailing digits are treated as a genuine decimal fraction.
    const isThousands = dotCount > 1 || afterDot.length >= 3;
    if (isThousands) cleaned = cleaned.replace(/\./g, "");
    decimalSeparator = ".";
    thousandsSeparator = "";
  } else if (lastCommaIndex > -1 && lastDotIndex === -1) {
    const afterComma = cleaned.substring(lastCommaIndex + 1);
    const commaIsThousands = commaCount > 1 || afterComma.length >= 3;
    if (commaIsThousands) {
      cleaned = cleaned.replace(/,/g, "");
      decimalSeparator = ".";
    } else {
      decimalSeparator = ",";
    }
    thousandsSeparator = "";
  }

  let result = cleaned;
  if (thousandsSeparator) {
    result = result.replace(new RegExp("\\" + thousandsSeparator, "g"), "");
  }
  result = result.replace(decimalSeparator, ".");

  const num = parseFloat(result);
  return isNegative ? -Math.abs(num) : num;
}
