/**
 * Email Validation Utilities
 */

export function isValidEmail(email: string): boolean {
  const emailRegex =
    /^[^\s@]+@[^\s@.][^\s@]*[^\s@.]\.[^\s@]+$|^[^\s@]+@[^\s@.]\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  if (email.includes("..")) return false;
  return true;
}

export function isValidEmailDomain(
  email: string,
  allowedDomains?: string[],
): boolean {
  if (!isValidEmail(email)) return false;
  if (!allowedDomains || allowedDomains.length === 0) return true;
  const domain = email.split("@")[1].toLowerCase();
  return allowedDomains.some((allowed) => domain === allowed.toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    "tempmail.com",
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "throwaway.email",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}
