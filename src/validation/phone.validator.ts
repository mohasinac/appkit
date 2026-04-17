/**
 * Phone Number Validation Utilities
 */

import {
  getDefaultCountry,
  getDefaultPhonePrefix,
} from "../core/baseline-resolver";

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  const cleaned = phone.replace(/[\s-()]/g, "");
  return phoneRegex.test(phone) && cleaned.length >= 10 && cleaned.length <= 15;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-()]/g, "");
}

export function formatPhone(phone: string, countryCode?: string): string {
  const resolved = countryCode ?? getDefaultCountry();
  const cleaned = normalizePhone(phone);
  if (resolved === "US" && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

export function extractCountryCode(phone: string): string | null {
  const cleaned = normalizePhone(phone);
  if (!cleaned.startsWith("+")) return null;
  const match = cleaned.match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : null;
}

export function isValidMobile(phone: string, phonePrefix?: string): boolean {
  const resolved = phonePrefix ?? getDefaultPhonePrefix();
  const cleaned = normalizePhone(phone).replace(
    new RegExp(`^\\${resolved}`),
    "",
  );
  // For +91 (India), validate 10-digit mobile starting with 6-9
  if (resolved === "+91") return /^[6-9]\d{9}$/.test(cleaned);
  // Generic: 10-15 digit number
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/** @deprecated Use `isValidMobile()` instead. */
export function isValidIndianMobile(phone: string): boolean {
  return isValidMobile(phone, "+91");
}

export function isValidIndianPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}
