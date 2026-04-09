// appkit/src/seed/factories/address.factory.ts
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
  return {
    id: overrides.id ?? `address-${n}`,
    userId: overrides.userId ?? `user-${n}`,
    line1: overrides.line1 ?? `${n * 10} Example Street`,
    city: overrides.city ?? "Mumbai",
    state: overrides.state ?? "Maharashtra",
    country: overrides.country ?? "IN",
    postal: overrides.postal ?? "400001",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

export function makeFullAddress(
  overrides: Partial<SeedAddressDocument> = {},
): SeedAddressDocument {
  return makeAddress({
    line2: "Apt 4B, Tower C",
    phone: "+919876543210",
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
