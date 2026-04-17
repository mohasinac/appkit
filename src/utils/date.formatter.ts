/**
 * Date Formatting Utilities
 */

import { getDefaultLocale } from "../core/baseline-resolver";

/**
 * Resolve any date-like value (Date, ISO string, number, or Firestore Timestamp JSON)
 * into a native Date object. Returns null for falsy or unparseable input.
 */
export function resolveDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as Record<string, unknown>)._seconds === "number"
  ) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  date: Date | string | number | unknown,
  format: "short" | "medium" | "long" | "full" = "medium",
  locale?: string,
): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  const dateObj = resolveDate(date);
  if (!dateObj) return "";

  const options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case "short":
      options.year = "2-digit";
      options.month = "numeric";
      options.day = "numeric";
      break;
    case "medium":
      options.year = "numeric";
      options.month = "short";
      options.day = "numeric";
      break;
    case "long":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      break;
    case "full":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      options.weekday = "long";
      break;
  }

  return dateObj.toLocaleDateString(resolvedLocale, options);
}

export function formatDateTime(
  date: Date | string | number | unknown,
  format: "short" | "medium" | "long" | "full" = "medium",
  locale?: string,
): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  const dateObj = resolveDate(date);
  if (!dateObj) return "";

  const dateOptions: Intl.DateTimeFormatOptions = {};
  const timeOptions: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case "short":
      dateOptions.year = "2-digit";
      dateOptions.month = "2-digit";
      dateOptions.day = "2-digit";
      timeOptions.hour = "2-digit";
      timeOptions.minute = "2-digit";
      break;
    case "medium":
      dateOptions.year = "numeric";
      dateOptions.month = "short";
      dateOptions.day = "numeric";
      timeOptions.hour = "2-digit";
      timeOptions.minute = "2-digit";
      break;
    case "long":
      dateOptions.year = "numeric";
      dateOptions.month = "long";
      dateOptions.day = "numeric";
      timeOptions.hour = "2-digit";
      timeOptions.minute = "2-digit";
      timeOptions.second = "2-digit";
      break;
    case "full":
      dateOptions.year = "numeric";
      dateOptions.month = "long";
      dateOptions.day = "numeric";
      dateOptions.weekday = "long";
      timeOptions.hour = "2-digit";
      timeOptions.minute = "2-digit";
      timeOptions.second = "2-digit";
      break;
  }

  const datePart = dateObj.toLocaleDateString(resolvedLocale, dateOptions);
  const timePart = dateObj.toLocaleTimeString(resolvedLocale, timeOptions);
  return `${datePart}, ${timePart}`;
}

export function formatTime(
  date: Date | string,
  format: "short" | "long" = "long",
  locale?: string,
): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions =
    format === "short"
      ? { hour: "2-digit", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit", second: "2-digit" };
  return dateObj.toLocaleTimeString(resolvedLocale, options);
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? "s" : ""} ago`;
  if (diffMonth < 12)
    return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
  return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
}

export function formatMonthYear(date: Date | string, locale?: string): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString(resolvedLocale, {
    month: "long",
    year: "numeric",
  });
}

export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale?: string,
): string {
  const resolvedLocale = locale ?? getDefaultLocale();
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const startFormatted = start.toLocaleDateString(resolvedLocale, {
    month: "short",
    day: "numeric",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  });
  const endFormatted = end.toLocaleDateString(resolvedLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFormatted} - ${endFormatted}`;
}

export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.getTime() < Date.now();
}

export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.getTime() > Date.now();
}

export function nowMs(): number {
  return Date.now();
}

export function isSameMonth(a: Date | number, b: Date | number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
  );
}

export function currentYear(): string {
  return new Date(nowMs()).getFullYear().toString();
}

export function nowISO(): string {
  return new Date(nowMs()).toISOString();
}

export function formatCustomDate(
  date: Date | string,
  format: "short" | "medium" | "long" | "full" = "medium",
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
    full: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  };
  const options = formatOptions[format] || formatOptions.medium;
  return dateObj.toLocaleDateString(getDefaultLocale(), options);
}
