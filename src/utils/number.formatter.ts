/**
 * Number Formatting Utilities
 */

import {
  getDefaultCurrency,
  getDefaultLocale,
} from "../core/baseline-resolver";

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

/**
 * Formats an integer paise amount as a currency string, e.g. 349900 -> "₹3,499".
 * Canonical helper for every paise-denominated amount across the codebase —
 * see CLAUDE.md's Recurrent Root Cause Patterns for why this was previously
 * duplicated as a local `formatPaise`/`toRupees` in 5+ admin/seller views.
 */
export function formatPaise(paise: number, currency?: string, locale?: string): string {
  return formatCurrency(paise / 100, currency, locale);
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
