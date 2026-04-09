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
