/**
 * Indian states and union territories, resolved to ONE canonical key from any
 * of the three spellings that actually occur in our data.
 *
 * WHY (G2): place of supply was compared by normalised STRING EQUALITY —
 * lowercase, strip punctuation, collapse whitespace, then `a === b`. That is
 * correct only when both sides happen to be written the same way, and they are
 * not:
 *
 *   · `StoreDocument`'s pickup address state is typed by a seller ("Karnataka",
 *     "karnataka", "KA", "Karnatak")
 *   · a buyer's delivery address is typed by the buyer
 *   · a GSTIN carries the state as a two-digit CODE in its first two
 *     characters ("29" = Karnataka) — and the old normaliser's
 *     `.replace(/[^a-z\s]/g, " ")` stripped digits entirely, so a numeric
 *     state resolved to `null`
 *
 * So `"KA"` vs `"Karnataka"` compared unequal, the supply read as INTER-state,
 * and the order recorded **IGST where CGST+SGST was due**. Silently: there is
 * no error, and the TOTAL is identical either way (IGST total == CGST+SGST
 * total), so nothing downstream disagreed. Only the invoice's tax split was
 * wrong, which is exactly the part a GST return is built from.
 *
 * 🛑 The total being unaffected is why this is a COMPLIANCE defect rather than
 * a money defect, and why it could live indefinitely. Do not downgrade it on
 * that basis: the split is what gets filed.
 */

/**
 * Canonical key → the GST state code and the display name.
 *
 * Codes are the official GST state codes (the first two digits of a GSTIN).
 * 🛑 They are LITERAL and ordered by code, so the table can be read against
 * the published list rather than trusted.
 */
export const INDIA_STATES = {
  "jammu-kashmir": { code: "01", name: "Jammu and Kashmir" },
  "himachal-pradesh": { code: "02", name: "Himachal Pradesh" },
  punjab: { code: "03", name: "Punjab" },
  chandigarh: { code: "04", name: "Chandigarh" },
  uttarakhand: { code: "05", name: "Uttarakhand" },
  haryana: { code: "06", name: "Haryana" },
  delhi: { code: "07", name: "Delhi" },
  rajasthan: { code: "08", name: "Rajasthan" },
  "uttar-pradesh": { code: "09", name: "Uttar Pradesh" },
  bihar: { code: "10", name: "Bihar" },
  sikkim: { code: "11", name: "Sikkim" },
  "arunachal-pradesh": { code: "12", name: "Arunachal Pradesh" },
  nagaland: { code: "13", name: "Nagaland" },
  manipur: { code: "14", name: "Manipur" },
  mizoram: { code: "15", name: "Mizoram" },
  tripura: { code: "16", name: "Tripura" },
  meghalaya: { code: "17", name: "Meghalaya" },
  assam: { code: "18", name: "Assam" },
  "west-bengal": { code: "19", name: "West Bengal" },
  jharkhand: { code: "20", name: "Jharkhand" },
  odisha: { code: "21", name: "Odisha" },
  chhattisgarh: { code: "22", name: "Chhattisgarh" },
  "madhya-pradesh": { code: "23", name: "Madhya Pradesh" },
  gujarat: { code: "24", name: "Gujarat" },
  "dadra-nagar-haveli-daman-diu": {
    code: "26",
    name: "Dadra and Nagar Haveli and Daman and Diu",
  },
  maharashtra: { code: "27", name: "Maharashtra" },
  karnataka: { code: "29", name: "Karnataka" },
  goa: { code: "30", name: "Goa" },
  lakshadweep: { code: "31", name: "Lakshadweep" },
  kerala: { code: "32", name: "Kerala" },
  "tamil-nadu": { code: "33", name: "Tamil Nadu" },
  puducherry: { code: "34", name: "Puducherry" },
  "andaman-nicobar": { code: "35", name: "Andaman and Nicobar Islands" },
  telangana: { code: "36", name: "Telangana" },
  "andhra-pradesh": { code: "37", name: "Andhra Pradesh" },
  ladakh: { code: "38", name: "Ladakh" },
} as const satisfies Record<string, { code: string; name: string }>;

export type IndiaStateKey = keyof typeof INDIA_STATES;

/**
 * Every alternative spelling we accept, mapped to the canonical key.
 *
 * Deliberately NOT exhaustive-by-guessing: each entry is a form that plausibly
 * appears in an address field or a dropdown — the two-letter postal
 * abbreviation, the pre-2019 names (`orissa`, `pondicherry`), and the common
 * run-together spellings. A form that is not here resolves to `null`, which is
 * honest; a wrong guess resolves to the WRONG STATE, which is worse than
 * unknown. See `resolveStateKey`'s undetermined handling.
 */
const ALIASES: Readonly<Record<string, IndiaStateKey>> = {
  // two-letter abbreviations
  jk: "jammu-kashmir", hp: "himachal-pradesh", pb: "punjab", ch: "chandigarh",
  uk: "uttarakhand", ua: "uttarakhand", hr: "haryana", dl: "delhi",
  rj: "rajasthan", up: "uttar-pradesh", br: "bihar", sk: "sikkim",
  ar: "arunachal-pradesh", nl: "nagaland", mn: "manipur", mz: "mizoram",
  tr: "tripura", ml: "meghalaya", as: "assam", wb: "west-bengal",
  jh: "jharkhand", or: "odisha", od: "odisha", cg: "chhattisgarh",
  ct: "chhattisgarh", mp: "madhya-pradesh", gj: "gujarat", mh: "maharashtra",
  ka: "karnataka", ga: "goa", ld: "lakshadweep", kl: "kerala",
  tn: "tamil-nadu", py: "puducherry", pondy: "puducherry",
  an: "andaman-nicobar", tg: "telangana", ts: "telangana",
  ap: "andhra-pradesh", la: "ladakh", dn: "dadra-nagar-haveli-daman-diu",
  dd: "dadra-nagar-haveli-daman-diu",
  // former / alternative names
  orissa: "odisha",
  pondicherry: "puducherry",
  uttaranchal: "uttarakhand",
  "new delhi": "delhi",
  "nct of delhi": "delhi",
  "national capital territory of delhi": "delhi",
  "jammu kashmir": "jammu-kashmir",
  "andaman and nicobar": "andaman-nicobar",
  "andaman nicobar islands": "andaman-nicobar",
  "dadra and nagar haveli": "dadra-nagar-haveli-daman-diu",
  "daman and diu": "dadra-nagar-haveli-daman-diu",
};

/** Collapse to a comparison form: lowercase, letters and spaces only. */
function flatten(raw: string): string {
  return raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve any spelling — canonical key, full name, abbreviation, former name,
 * or a two-digit GST state code — to one canonical key, or `null`.
 *
 * 🛑 The numeric branch runs FIRST and before any letter-stripping, because
 * the old normaliser destroyed digits. A state held as `"29"` or as a full
 * GSTIN (`"29ABCDE1234F1Z5"`) is a real shape in this data: `resolveSupplierIdentity`
 * reads a store's GSTIN, and its first two characters are the authoritative
 * place of supply for the seller — more reliable than their typed pickup
 * address, which is what G3 is about.
 */
export function resolveStateKey(raw: string | undefined | null): IndiaStateKey | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // A bare code, or the leading two digits of a GSTIN.
  const codeMatch = /^(\d{2})/.exec(trimmed);
  if (codeMatch) {
    const code = codeMatch[1];
    for (const [key, meta] of Object.entries(INDIA_STATES)) {
      if (meta.code === code) return key as IndiaStateKey;
    }
    // A two-digit prefix that is not a valid state code is NOT a state.
    return null;
  }

  const flat = flatten(trimmed);
  if (!flat) return null;

  // Canonical key (hyphenated) → its flattened form is the key with spaces.
  for (const key of Object.keys(INDIA_STATES) as IndiaStateKey[]) {
    if (flat === key.replace(/-/g, " ")) return key;
  }
  // Display name.
  for (const [key, meta] of Object.entries(INDIA_STATES)) {
    if (flat === flatten(meta.name)) return key as IndiaStateKey;
  }
  // Alias table.
  const alias = ALIASES[flat];
  if (alias) return alias;

  /*
   * A last resort: drop "and"/"&" joiners, which is the single most common
   * divergence in real addresses ("Jammu and Kashmir" vs "Jammu Kashmir",
   * "Andaman and Nicobar Islands" vs "Andaman Nicobar"). Compared against the
   * same reduction of each display name, so it cannot match across states.
   */
  const noJoiners = flat.replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
  if (noJoiners !== flat) {
    for (const [key, meta] of Object.entries(INDIA_STATES)) {
      const target = flatten(meta.name).replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
      if (noJoiners === target) return key as IndiaStateKey;
    }
    const aliased = ALIASES[noJoiners];
    if (aliased) return aliased;
  }
  return null;
}

/** The GST state code for any spelling, or `null`. */
export function resolveStateCode(raw: string | undefined | null): string | null {
  const key = resolveStateKey(raw);
  return key ? INDIA_STATES[key].code : null;
}
