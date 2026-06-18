/**
 * General Input Validation Utilities
 */

export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function exactLength(value: string, length: number): boolean {
  return value.length === length;
}

export function isNumeric(value: string): boolean {
  return !isNaN(Number(value)) && !isNaN(parseFloat(value));
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

export function isInList<T>(value: T, list: T[]): boolean {
  return list.includes(value);
}
