/*
 * WHY: A postal code was validated by **fifteen** different rules, and they
 *      disagreed. Two of them are server-side rules on the SAME entity:
 *      `src/actions/address.actions.ts` said `.min(4).max(10)` while
 *      `src/validation/request-schemas.ts` said `/^\d{6}$/`. Another accepted
 *      5-or-6 digits. And `src/app/api/admin/addresses/route.ts` used
 *      `.min(6).max(6)` — a LENGTH check with no character class, so
 *      `"abcdef"` was a valid Indian PIN code as far as it was concerned.
 *
 *      Meanwhile the client form said `z.string().min(1)`, so `abc` passed
 *      every check the user could see and came back as a server 400 with
 *      nothing on the field.
 *
 *      The India-only regex was itself a bug in waiting: `country` is a free
 *      text field, so a Canadian address was being held to `/^\d{6}$/`.
 *
 * WHAT: One postal rule per country, and the country list that carries it.
 *
 * ## Why this is curated rather than all 250 ISO countries
 *
 * A pattern is only worth having if it is RIGHT. Hand-typing 250 of them from
 * memory produces a table that looks authoritative and quietly rejects real
 * addresses — which is worse than not knowing, because the user cannot
 * override it. So the list covers the countries this marketplace actually
 * ships to and to which its sellers source, and everything else resolves to
 * `null`, which means "accept anything plausible".
 *
 * 🛑 An unknown country must never BLOCK a save. A postal rule exists to catch
 * a typo, not to police the atlas.
 *
 * EXPORTS:
 *   COUNTRIES, COUNTRY_CODES, DEFAULT_COUNTRY, type CountryCode,
 *   type CountryDef, countryFor, postalPatternFor, isValidPostalCode,
 *   postalLabelFor, POSTAL_MIN, POSTAL_MAX
 *
 * @tag domain:geo
 * @tag layer:constants
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:address forms,address routes,usePostalLookup
 * @tag sideEffects:none
 */

/** One country, as an address form needs it. */
export interface CountryDef {
  /** ISO-3166-1 alpha-2. Also the key. */
  code: string;
  name: string;
  /**
   * What a valid postal code looks like here, or `null` when we do not know.
   *
   * `null` is a real answer, not a gap to be filled with a guess: the
   * fallback accepts 3–12 characters, which catches an empty box and a pasted
   * paragraph and nothing in between.
   */
  postalPattern: RegExp | null;
  /** What the country calls it — "PIN code", "ZIP code", "Postcode". */
  postalLabel: string;
  /** Whether `SUBDIVISIONS` enumerates its states/provinces. */
  hasStates: boolean;
  /** E.164 calling code, without the `+`. */
  dialCode: string;
}

/** The permissive bound applied when a country has no pattern. */
export const POSTAL_MIN = 3;
export const POSTAL_MAX = 12;

/**
 * 🛑 Patterns are anchored and case-insensitive where the country's format
 * includes letters. An unanchored pattern would accept a code with trailing
 * junk, which is exactly the class of typo this is meant to catch.
 */
const COUNTRY_LIST: CountryDef[] = [
  { code: "IN", name: "India", postalPattern: /^[1-9]\d{5}$/, postalLabel: "PIN code", hasStates: true, dialCode: "91" },
  { code: "US", name: "United States", postalPattern: /^\d{5}(-\d{4})?$/, postalLabel: "ZIP code", hasStates: true, dialCode: "1" },
  { code: "GB", name: "United Kingdom", postalPattern: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, postalLabel: "Postcode", hasStates: false, dialCode: "44" },
  { code: "CA", name: "Canada", postalPattern: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, postalLabel: "Postal code", hasStates: true, dialCode: "1" },
  { code: "AU", name: "Australia", postalPattern: /^\d{4}$/, postalLabel: "Postcode", hasStates: true, dialCode: "61" },
  { code: "NZ", name: "New Zealand", postalPattern: /^\d{4}$/, postalLabel: "Postcode", hasStates: false, dialCode: "64" },
  { code: "SG", name: "Singapore", postalPattern: /^\d{6}$/, postalLabel: "Postal code", hasStates: false, dialCode: "65" },
  { code: "MY", name: "Malaysia", postalPattern: /^\d{5}$/, postalLabel: "Postcode", hasStates: false, dialCode: "60" },
  { code: "JP", name: "Japan", postalPattern: /^\d{3}-?\d{4}$/, postalLabel: "Postal code", hasStates: false, dialCode: "81" },
  { code: "DE", name: "Germany", postalPattern: /^\d{5}$/, postalLabel: "PLZ", hasStates: false, dialCode: "49" },
  { code: "FR", name: "France", postalPattern: /^\d{5}$/, postalLabel: "Code postal", hasStates: false, dialCode: "33" },
  { code: "NL", name: "Netherlands", postalPattern: /^\d{4}\s*[A-Z]{2}$/i, postalLabel: "Postcode", hasStates: false, dialCode: "31" },
  { code: "IT", name: "Italy", postalPattern: /^\d{5}$/, postalLabel: "CAP", hasStates: false, dialCode: "39" },
  { code: "ES", name: "Spain", postalPattern: /^\d{5}$/, postalLabel: "Código postal", hasStates: false, dialCode: "34" },
  { code: "AE", name: "United Arab Emirates", postalPattern: null, postalLabel: "Postal code", hasStates: false, dialCode: "971" },
  { code: "SA", name: "Saudi Arabia", postalPattern: /^\d{5}$/, postalLabel: "Postal code", hasStates: false, dialCode: "966" },
  { code: "LK", name: "Sri Lanka", postalPattern: /^\d{5}$/, postalLabel: "Postal code", hasStates: false, dialCode: "94" },
  { code: "BD", name: "Bangladesh", postalPattern: /^\d{4}$/, postalLabel: "Postal code", hasStates: false, dialCode: "880" },
  { code: "NP", name: "Nepal", postalPattern: /^\d{5}$/, postalLabel: "Postal code", hasStates: false, dialCode: "977" },
  { code: "PK", name: "Pakistan", postalPattern: /^\d{5}$/, postalLabel: "Postal code", hasStates: false, dialCode: "92" },
  { code: "CN", name: "China", postalPattern: /^\d{6}$/, postalLabel: "Postal code", hasStates: false, dialCode: "86" },
  { code: "HK", name: "Hong Kong", postalPattern: null, postalLabel: "Postal code", hasStates: false, dialCode: "852" },
  { code: "TH", name: "Thailand", postalPattern: /^\d{5}$/, postalLabel: "Postal code", hasStates: false, dialCode: "66" },
  { code: "ID", name: "Indonesia", postalPattern: /^\d{5}$/, postalLabel: "Postal code", hasStates: false, dialCode: "62" },
  { code: "PH", name: "Philippines", postalPattern: /^\d{4}$/, postalLabel: "Postal code", hasStates: false, dialCode: "63" },
  { code: "ZA", name: "South Africa", postalPattern: /^\d{4}$/, postalLabel: "Postal code", hasStates: false, dialCode: "27" },
  { code: "BR", name: "Brazil", postalPattern: /^\d{5}-?\d{3}$/, postalLabel: "CEP", hasStates: false, dialCode: "55" },
  { code: "MX", name: "Mexico", postalPattern: /^\d{5}$/, postalLabel: "Código postal", hasStates: false, dialCode: "52" },
];

export const COUNTRIES: Record<string, CountryDef> = Object.fromEntries(
  COUNTRY_LIST.map((c) => [c.code, c]),
);

export const COUNTRY_CODES = COUNTRY_LIST.map((c) => c.code);

export type CountryCode = string;

/** Where this marketplace is, and what an address defaults to. */
export const DEFAULT_COUNTRY = "IN";

/**
 * Resolve a country by code or by name.
 *
 * By NAME as well, because `AddressDocument.country` is a free-text string
 * today and holds `"India"` on every seeded and user-entered row. A resolver
 * that only understood codes would treat every existing address as an unknown
 * country and silently drop to the permissive rule — the migration would look
 * like it worked and would have switched validation off.
 */
export function countryFor(value: string | undefined | null): CountryDef | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const byCode = COUNTRIES[trimmed.toUpperCase()];
  if (byCode) return byCode;
  const lower = trimmed.toLowerCase();
  return COUNTRY_LIST.find((c) => c.name.toLowerCase() === lower) ?? null;
}

/** The postal pattern for a country, or `null` when none is known. */
export function postalPatternFor(country: string | undefined | null): RegExp | null {
  return countryFor(country)?.postalPattern ?? null;
}

/** "PIN code" / "ZIP code" / "Postcode" — what to put on the label. */
export function postalLabelFor(country: string | undefined | null): string {
  return countryFor(country)?.postalLabel ?? "Postal code";
}

/**
 * The ONE postal check, used by every form and every route.
 *
 * An empty code is NOT valid — required-ness is the caller's business, but a
 * blank string is never a postal code, and letting it through here is how the
 * `.min(1)` client rule came to disagree with the server in the first place.
 */
export function isValidPostalCode(
  country: string | undefined | null,
  postalCode: string | undefined | null,
): boolean {
  const code = (postalCode ?? "").trim();
  if (!code) return false;
  const pattern = postalPatternFor(country);
  if (pattern) return pattern.test(code);
  return code.length >= POSTAL_MIN && code.length <= POSTAL_MAX;
}
