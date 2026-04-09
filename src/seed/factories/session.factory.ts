// appkit/src/seed/factories/session.factory.ts
let _seq = 1;

export interface SeedSessionDocument {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: Date;
  lastActiveAt?: Date;
  revokedAt?: Date;
}

export function makeSession(
  overrides: Partial<SeedSessionDocument> = {},
): SeedSessionDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `session-${n}`,
    userId: overrides.userId ?? `user-${n}`,
    userAgent:
      overrides.userAgent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ip: overrides.ip ?? "203.0.113.1",
    createdAt: overrides.createdAt ?? now,
    lastActiveAt: overrides.lastActiveAt ?? now,
    ...overrides,
  };
}

export function makeRevokedSession(
  overrides: Partial<SeedSessionDocument> = {},
): SeedSessionDocument {
  const revokedAt = new Date();
  revokedAt.setDate(revokedAt.getDate() - 1);
  return makeSession({ revokedAt, ...overrides });
}

export const SESSION_FIXTURES = {
  active: makeSession({
    id: "session-active-1",
    userId: "buyer-user-1",
  }),
  revoked: makeRevokedSession({
    id: "session-revoked-1",
    userId: "buyer-user-1",
  }),
};
