/**
 * PII Redaction Utility
 *
 * Recursively sanitizes objects before logging by masking or redacting
 * known PII (Personally Identifiable Information) field names.
 *
 * - Secrets (password, token, apiKey, etc.) → "[REDACTED]"
 * - Emails → partial mask: "mo***@gmail.com"
 * - Phones → last 4 digits: "***9876"
 * - Names → first char + asterisks: "J********"
 * - Addresses, financial IDs → "[REDACTED]"
 * - IPs → first octet only: "192.***.***.***"
 */

const MAX_DEPTH = 10;

/** Keys whose values are fully replaced with "[REDACTED]" */
const REDACT_KEYS = new Set([
  "password",
  "secret",
  "apiKey",
  "apiSecret",
  "token",
  "refreshToken",
  "accessToken",
  "authorization",
  "cookie",
  "sessionToken",
  "accountNumber",
  "ifscCode",
  "upiId",
  "bankAccount",
  "pan",
  "panNumber",
  "aadhar",
  "aadhaar",
  "ssn",
  "gstin",
  "gstNumber",
  "addressLine1",
  "addressLine2",
  "address",
  "zipCode",
]);

/** Keys whose string values get email masking */
const EMAIL_KEYS = new Set([
  "email",
  "userEmail",
  "sellerEmail",
  "shiprocketEmail",
]);

/** Keys whose string values get phone masking */
const PHONE_KEYS = new Set(["phone", "phoneNumber", "mobileNumber"]);

/** Keys whose string values get name masking */
const NAME_KEYS = new Set([
  "fullName",
  "firstName",
  "lastName",
]);

/** Keys whose string values get IP masking */
const IP_KEYS = new Set(["ip", "ipAddress"]);

function maskEmail(value: string): string {
  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return "[REDACTED]";
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local.slice(0, 2)}***${domain}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "[REDACTED]";
  return `***${digits.slice(-4)}`;
}

function maskName(value: string): string {
  if (!value || value.length < 2) return "[REDACTED]";
  return `${value[0]}${"*".repeat(Math.min(value.length - 1, 8))}`;
}

function maskIp(value: string): string {
  const parts = value.split(".");
  if (parts.length === 4) return `${parts[0]}.***.***.***`;
  return "[REDACTED]";
}

function redactStringValue(key: string, value: string): string {
  if (REDACT_KEYS.has(key)) return "[REDACTED]";
  if (EMAIL_KEYS.has(key)) return maskEmail(value);
  if (PHONE_KEYS.has(key)) return maskPhone(value);
  if (NAME_KEYS.has(key)) return maskName(value);
  if (IP_KEYS.has(key)) return maskIp(value);
  return value;
}

/**
 * Recursively redact PII from a data object before logging.
 *
 * Returns a new object with sensitive fields masked — the original is
 * never mutated.
 */
export function redactPii(data: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[MAX_DEPTH]";
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactPii(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === "string") {
      result[key] = redactStringValue(key, value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactPii(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// UI display helpers
// ---------------------------------------------------------------------------

const ENC_TOKEN_PREFIX = "enc:v1:";

/**
 * Safe display name for untrusted / possibly-encrypted PII fields.
 *
 * When a field value is an encrypted token (`enc:v1:...`) — i.e. the server
 * forgot to decrypt before serialising — it must never be shown to the user.
 * This function returns a readable `fallback` string instead.
 *
 * @example
 * safeDisplayName(product.sellerName)        // → "John" or "Seller"
 * safeDisplayName("enc:v1:abc...", "Seller") // → "Seller"
 */
export function safeDisplayName(
  value: string | null | undefined,
  fallback = "Seller",
): string {
  if (!value) return fallback;
  if (value.startsWith(ENC_TOKEN_PREFIX)) return fallback;
  return value;
}

/**
 * Safe display email — returns fallback if encrypted or missing.
 */
export function safeDisplayEmail(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  if (value.startsWith(ENC_TOKEN_PREFIX)) return fallback;
  return value;
}
