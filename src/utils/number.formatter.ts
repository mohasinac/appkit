/**
 * Number Formatting Utilities
 */

export function formatCurrency(
  amount: number,
  currency: string = "INR",
  locale: string = "en-IN",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}

export function formatNumber(
  num: number,
  locale: string = "en-IN",
  options?: { decimals?: number },
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.decimals,
    maximumFractionDigits: options?.decimals,
  }).format(num);
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
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
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
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    } else if (afterDot.length > 3) {
      cleaned = cleaned.replace(/\./g, "");
    }
    decimalSeparator = ".";
    thousandsSeparator = "";
  } else if (lastCommaIndex > -1 && lastDotIndex === -1) {
    const afterComma = cleaned.substring(lastCommaIndex + 1);
    if (commaCount > 1) {
      cleaned = cleaned.replace(/,/g, "");
      decimalSeparator = ".";
      thousandsSeparator = "";
    } else if (afterComma.length > 3) {
      cleaned = cleaned.replace(/,/g, "");
      decimalSeparator = ".";
      thousandsSeparator = "";
    } else {
      decimalSeparator = ",";
      thousandsSeparator = "";
    }
  }

  let result = cleaned;
  if (thousandsSeparator) {
    result = result.replace(new RegExp("\\" + thousandsSeparator, "g"), "");
  }
  result = result.replace(decimalSeparator, ".");

  const num = parseFloat(result);
  return isNegative ? -Math.abs(num) : num;
}
