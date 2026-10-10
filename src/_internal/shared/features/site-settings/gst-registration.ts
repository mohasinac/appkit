/**
 * GST registration validity — the gate on turning product GST ON.
 *
 * ## Why this exists
 *
 * `siteSettings.gst.enabled` decides whether product GST is charged at all
 * (`createOrderForGroup` computes a breakdown only when `gstSettings?.enabled`
 * and a buyer state are both present). Until now the admin form sent
 * `{ enabled, gstin: gstin.trim().toUpperCase(), legalName, address }` with
 * **no validation of any kind**, and `/api/admin/site` types every group as
 * `z.unknown()` — so GST collection could be switched on with an **empty or
 * malformed GSTIN**, after which every invoice charges tax under no valid
 * registration and prints whatever string was typed.
 *
 * That is the same class as C0c defect 4 (`SETTINGS_ENCRYPTION_KEY` unset must
 * fail LOUDLY rather than storing plaintext): a compliance precondition has to
 * be refused at the write, not discovered on an invoice.
 *
 * ## Shape
 *
 * 15 characters: `99AAAAA9999A9Z9`
 *
 *   `[0-9]{2}`    state code
 *   `[A-Z]{5}`    first five of the holder's PAN
 *   `[0-9]{4}`    PAN digits
 *   `[A-Z]`       PAN entity letter
 *   `[0-9A-Z]`    registration number within the state
 *   `Z`           fixed
 *   `[0-9A-Z]`    checksum
 *
 * ## Why the checksum is BLOCKING and not advisory
 *
 * It was verified against the GSTIN that India's own GST material uses as its
 * worked example (`27AAPFU0939F1ZV`) plus five more real-format registrations,
 * and against every single-character mutation of them. A regex alone accepts a
 * transposed digit, which is the realistic typo on a 15-character code copied
 * off a certificate.
 *
 * 🛑 The risk runs the other way too, and it is why this was measured rather
 * than assumed: a wrong checksum implementation would refuse a LEGITIMATE
 * registration and leave a real business unable to invoice at all — strictly
 * worse than accepting a typo. Do not change the algorithm without re-running
 * the assertions.
 *
 * Pure. No React, no Firestore, no env.
 */

/** `99AAAAA9999A9Z9` — shape only; see `isValidGstin` for the checksum. */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

/** The 36 symbols GSTIN checksum arithmetic runs in, in value order. */
const GSTIN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The published GSTIN check character for the first 14 characters.
 *
 * Base-36 positional weights alternate 1, 2 from the left. For each character:
 * multiply its value by its weight, then add the quotient and the remainder of
 * that product divided by 36. The check value is `(36 - sum % 36) % 36`.
 *
 * Returns `null` when the prefix is not 14 characters of the alphabet — a
 * caller must not treat that as "checksum failed", because it is a different
 * fault with a different message.
 */
export function gstinCheckCharacter(first14: string): string | null {
  if (first14.length !== 14) return null;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = GSTIN_ALPHABET.indexOf(first14[i]!);
    if (value < 0) return null;
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_ALPHABET[(36 - (sum % 36)) % 36]!;
}

/** Shape AND checksum. Whitespace and case are the caller's to normalise. */
export function isValidGstin(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const value = raw.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(value)) return false;
  return gstinCheckCharacter(value.slice(0, 14)) === value[14];
}

export interface GstEnablementInput {
  enabled?: boolean;
  gstin?: string;
  legalName?: string;
  address?: string;
}

/**
 * One problem per field, keyed by the field that owns it, so a caller can pipe
 * each straight into `setFieldError(key, message)` per Rule #9 — rather than a
 * single banner the admin has to map back onto four inputs themselves.
 */
export type GstEnablementProblems = Partial<
  Record<"gstin" | "legalName" | "address", string>
>;

/**
 * What must be true before product GST may be charged.
 *
 * 🛑 Only checked when `enabled` is being set to `true`. Turning GST **off**
 * must never be blocked by the state of the fields it is turning off — that
 * would trap an admin who enabled it with bad data in exactly the state they
 * are trying to leave.
 *
 * `legalName` and `address` are required alongside the number because a tax
 * invoice carries all three, and the invoice renderer snapshots all three onto
 * the order. Enabling with two of them produces an invoice with a blank
 * supplier block, which is not a lesser version of compliance.
 */
export function validateGstEnablement(
  input: GstEnablementInput,
): GstEnablementProblems {
  if (input.enabled !== true) return {};
  const problems: GstEnablementProblems = {};

  const gstin = (input.gstin ?? "").trim().toUpperCase();
  if (gstin.length === 0) {
    problems.gstin = "A GSTIN is required before GST can be charged.";
  } else if (!GSTIN_PATTERN.test(gstin)) {
    problems.gstin =
      "A GSTIN is 15 characters in the form 99AAAAA9999A9Z9 — check it against your registration certificate.";
  } else if (gstinCheckCharacter(gstin.slice(0, 14)) !== gstin[14]) {
    problems.gstin =
      "That GSTIN fails its own check digit, so it contains a typo. Compare it character by character with your certificate.";
  }

  if ((input.legalName ?? "").trim().length === 0) {
    problems.legalName =
      "The registered legal name is required — it is printed on every tax invoice.";
  }
  if ((input.address ?? "").trim().length === 0) {
    problems.address =
      "The registered address is required — it is printed on every tax invoice.";
  }

  return problems;
}

/** `true` when GST may be enabled with this input. */
export function canEnableGst(input: GstEnablementInput): boolean {
  return Object.keys(validateGstEnablement(input)).length === 0;
}
