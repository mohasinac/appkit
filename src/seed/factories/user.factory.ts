// appkit/src/seed/factories/user.factory.ts
let _seq = 1;

export interface SeedBaseUserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  roles: string[];
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function makeUser(
  overrides: Partial<SeedBaseUserDocument> = {},
): SeedBaseUserDocument {
  const n = _seq++;
  const now = new Date();
  return {
    uid: overrides.uid ?? `user-${n}`,
    email: overrides.email ?? `user${n}@example.com`,
    displayName: overrides.displayName ?? `User ${n}`,
    photoURL: overrides.photoURL,
    roles: overrides.roles ?? ["user"],
    emailVerified: overrides.emailVerified ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

/** Full user with all optional fields populated — for rendering tests */
export function makeFullUser(
  overrides: Partial<SeedBaseUserDocument> = {},
): SeedBaseUserDocument {
  return makeUser({
    photoURL: "https://example.com/avatar.jpg",
    emailVerified: true,
    ...overrides,
  });
}

/** Named fixtures used by seed scripts and integration tests */
export const USER_FIXTURES = {
  admin: makeFullUser({
    uid: "admin-user-1",
    email: "admin@example.com",
    displayName: "Admin User",
    roles: ["admin"],
    emailVerified: true,
  }),
  seller: makeFullUser({
    uid: "seller-user-1",
    email: "seller@example.com",
    displayName: "Seller User",
    roles: ["seller"],
    emailVerified: true,
  }),
  buyer: makeUser({
    uid: "buyer-user-1",
    email: "buyer@example.com",
    displayName: "Buyer User",
    roles: ["user"],
    emailVerified: true,
  }),
};
