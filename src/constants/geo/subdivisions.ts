/*
 * WHY: `INDIAN_STATES` existed and was used by **one** file — the admin
 *      address editor — while the user-facing `AddressForm` and
 *      `SellerAddressesView` both wrote the same `AddressDocument.state`
 *      through a FREE TEXT input. So the same field held "Karnataka",
 *      "karnataka", "KA" and "Karnatka" depending on which of the three
 *      surfaces created the row, and nothing could group or filter on it.
 * WHAT: Country → subdivisions, for every country whose `hasStates` is true.
 *
 * ## Only what is enumerated
 *
 * A country appears here when `COUNTRIES[code].hasStates` is true, and the two
 * must agree — `audit-address-shape` checks that. A country with `hasStates`
 * and no list would render an empty picker with no way to type a state, which
 * is strictly worse than the free-text box this replaces.
 *
 * EXPORTS: SUBDIVISIONS, subdivisionsFor, type IndianState
 *
 * @tag domain:geo
 * @tag layer:constants
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:address forms
 * @tag sideEffects:none
 */

/** India's 28 states + 8 union territories. */
const INDIA = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = (typeof INDIA)[number];

const US = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const CA = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Yukon",
];

const AU = [
  "Australian Capital Territory", "New South Wales", "Northern Territory",
  "Queensland", "South Australia", "Tasmania", "Victoria",
  "Western Australia",
];

/** Country code → its subdivisions, alphabetical within each. */
export const SUBDIVISIONS: Record<string, readonly string[]> = {
  IN: INDIA,
  US,
  CA,
  AU,
};

/**
 * The subdivisions for a country, or an empty list when it has none.
 *
 * An empty list is the signal to render a free-text State input rather than a
 * picker — see `hasStates` on the country definition.
 */
export function subdivisionsFor(countryCode: string | undefined | null): readonly string[] {
  if (!countryCode) return [];
  return SUBDIVISIONS[countryCode.trim().toUpperCase()] ?? [];
}
