// appkit/src/seed/factories/address.factory.ts
let _seq = 1;

// ─── Indian locale data pools ───────────────────────────────────────────────────────────────

const CITY_STATE: ReadonlyArray<readonly [string, string, string]> = [
  ["Mumbai",     "Maharashtra",      "400001"],
  ["New Delhi",  "Delhi",            "110001"],
  ["Bengaluru",  "Karnataka",        "560001"],
  ["Hyderabad",  "Telangana",        "500001"],
  ["Chennai",    "Tamil Nadu",       "600001"],
  ["Kolkata",    "West Bengal",      "700001"],
  ["Pune",       "Maharashtra",      "411001"],
  ["Ahmedabad",  "Gujarat",          "380001"],
  ["Jaipur",     "Rajasthan",        "302001"],
  ["Lucknow",    "Uttar Pradesh",    "226001"],
  ["Kochi",      "Kerala",           "682001"],
  ["Chandigarh", "Punjab",           "160001"],
  ["Bhopal",     "Madhya Pradesh",   "462001"],
  ["Surat",      "Gujarat",          "395001"],
  ["Indore",     "Madhya Pradesh",   "452001"],
] as const;

const STREET_NAMES = [
  "MG Road", "Station Road", "Main Street", "Gandhi Nagar",
  "Nehru Place", "Park Street", "Market Road", "Church Road",
] as const;

const BUILDING_NAMES = [
  "Shanti Apartments", "Laxmi Niwas", "Ganga Tower", "Sunrise Complex",
  "Green Park", "Silver Enclave", "Raj Towers", "Bhavani Heights",
] as const;

/** Generates an Indian mobile number (+91 6xxxxx–9xxxxx). */
function makePhone(n: number): string {
  const prefix = ["6", "7", "8", "9"][n % 4];
  const middle = String((n * 98765 + 10000) % 90000).padStart(5, "0");
  const suffix = String((n * 54321 + 1000) % 10000).padStart(4, "0");
  return `+91 ${prefix}${middle}${suffix}`;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length];
}

export interface SeedAddressDocument {
  id: string;
  userId: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postal: string;
  /** PII — encrypted before Firestore write by seed runner */
  phone?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function makeAddress(
  overrides: Partial<SeedAddressDocument> = {},
): SeedAddressDocument {
  const n = _seq++;
  const now = new Date();
  const [city, state, postal] = pick(CITY_STATE, n);
  return {
    id: overrides.id ?? `address-${n}`,
    userId: overrides.userId ?? `user-${n}`,
    line1: overrides.line1 ?? `${n * 7 + 1}, ${pick(STREET_NAMES, n)}`,
    city: overrides.city ?? city,
    state: overrides.state ?? state,
    country: overrides.country ?? "IN",
    postal: overrides.postal ?? postal,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

export function makeFullAddress(
  overrides: Partial<SeedAddressDocument> = {},
): SeedAddressDocument {
  const n = _seq;
  return makeAddress({
    line2: `${pick(BUILDING_NAMES, n)}, Flat ${(n % 12) + 1}${["A", "B", "C", "D"][n % 4]}`,
    phone: makePhone(n),
    isDefault: true,
    ...overrides,
  });
}

export const ADDRESS_FIXTURES = {
  default: makeFullAddress({
    id: "address-default-1",
    userId: "buyer-user-1",
    isDefault: true,
  }),
  secondary: makeAddress({
    id: "address-secondary-1",
    userId: "buyer-user-1",
    city: "Pune",
    postal: "411001",
  }),
};
