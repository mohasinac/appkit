// appkit/src/seed/factories/address.factory.ts
import {
  getSeedLocale,
  getDefaultCountry,
  makeSeedPhone,
  pick,
} from "../seed-market-config";

let _seq = 1;

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
  const locale = getSeedLocale();
  const [city, state, postal] = pick(locale.cities, n);
  return {
    id: overrides.id ?? `address-${n}`,
    userId: overrides.userId ?? `user-${n}`,
    line1: overrides.line1 ?? `${n * 7 + 1}, ${pick(locale.streetNames, n)}`,
    city: overrides.city ?? city,
    state: overrides.state ?? state,
    country: overrides.country ?? getDefaultCountry(),
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
  const locale = getSeedLocale();
  return makeAddress({
    line2: `${pick(locale.buildingNames, n)}, Flat ${(n % 12) + 1}${["A", "B", "C", "D"][n % 4]}`,
    phone: makeSeedPhone(n),
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
