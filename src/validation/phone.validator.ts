/**
 * Phone Number Validation Utilities
 */

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  const cleaned = phone.replace(/[\s-()]/g, "");
  return phoneRegex.test(phone) && cleaned.length >= 10 && cleaned.length <= 15;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-()]/g, "");
}

export function formatPhone(phone: string, countryCode: string = "US"): string {
  const cleaned = normalizePhone(phone);
  if (countryCode === "US" && cleaned.length === 10) {
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

export function isValidIndianMobile(phone: string): boolean {
  const cleaned = normalizePhone(phone).replace(/^\+91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

export function isValidIndianPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}
