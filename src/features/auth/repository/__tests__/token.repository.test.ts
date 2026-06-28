import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return { ...actual, prepareForFirestore: (d: Record<string, unknown>) => d };
});

vi.mock("../../../../contracts/field-ops", () => ({
  serverTimestamp: () => new Date(),
  increment: (n: number) => n,
  arrayUnion: (...args: unknown[]) => args,
  arrayRemove: (...args: unknown[]) => args,
  deleteField: () => null,
  registerFieldOps: vi.fn(),
}));

vi.mock("../../../../security", () => ({
  encryptPiiFields: (d: object) => d,
  decryptPiiFields: (d: object) => d,
  addPiiIndices: (d: object) => d,
  piiBlindIndex: (v: string) => `blind:${v}`,
  encryptPayoutDetails: (d: object) => d,
  decryptPayoutDetails: (d: object) => d,
  encryptShippingConfig: (d: object) => d,
  decryptShippingConfig: (d: object) => d,
  USER_PII_FIELDS: [],
  TOKEN_PII_FIELDS: [],
  TOKEN_PII_INDEX_MAP: {},
}));

vi.mock("../../../../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../utils")>();
  return { ...actual, resolveDate: (d: unknown) => (d instanceof Date ? d : d ? new Date(d as string) : null) };
});

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  EmailVerificationTokenRepository,
  PasswordResetTokenRepository,
} from "../token.repository";

const emailRepo = new EmailVerificationTokenRepository();
const passwordRepo = new PasswordResetTokenRepository();

function makeEmailToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "token-email-abc123",
    userId: "user-ravi",
    token: "secure-random-token",
    email: "ravi@example.com",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePasswordResetToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "pw-token-abc123",
    userId: "user-ravi",
    token: "pw-reset-token",
    email: "ravi@example.com",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
    used: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockCollection.get = vi.fn().mockResolvedValue(makeQuerySnap([]));
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(makeEmailToken(), "token-email-abc123"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  db.batch.mockReturnValue(mockBatch);
});

// ---------------------------------------------------------------------------
// EmailVerificationTokenRepository.findByToken
// ---------------------------------------------------------------------------
describe("EmailVerificationTokenRepository.findByToken", () => {
  it("returns token document when found", async () => {
    const token = makeEmailToken();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: token.id as string, data: token }]));
    const result = await emailRepo.findByToken("secure-random-token");
    expect(result).not.toBeNull();
    expect(result?.token).toBe("secure-random-token");
  });

  it("returns null when token does not exist", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await emailRepo.findByToken("nonexistent-token");
    expect(result).toBeNull();
  });

  it("queries by token field", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await emailRepo.findByToken("abc");
    expect(mockCollection.where).toHaveBeenCalledWith("token", "==", "abc");
  });
});

// ---------------------------------------------------------------------------
// EmailVerificationTokenRepository.isExpired
// ---------------------------------------------------------------------------
describe("EmailVerificationTokenRepository.isExpired", () => {
  it("returns false when expiresAt is in the future", () => {
    const token = makeEmailToken({ expiresAt: new Date(Date.now() + 60_000) });
    expect(emailRepo.isExpired(token as never)).toBe(false);
  });

  it("returns true when expiresAt is in the past", () => {
    const token = makeEmailToken({ expiresAt: new Date(Date.now() - 1000) });
    expect(emailRepo.isExpired(token as never)).toBe(true);
  });

  it("returns true when expiresAt is null/undefined", () => {
    const token = makeEmailToken({ expiresAt: null });
    expect(emailRepo.isExpired(token as never)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EmailVerificationTokenRepository.deleteAllForUser
// ---------------------------------------------------------------------------
describe("EmailVerificationTokenRepository.deleteAllForUser", () => {
  it("deletes all tokens for the user in batch", async () => {
    const tokens = [
      makeEmailToken({ id: "t-1" }),
      makeEmailToken({ id: "t-2" }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(tokens.map((t) => ({ id: t.id as string, data: t }))),
    );
    await emailRepo.deleteAllForUser("user-ravi");
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("commits even when no tokens exist for the user", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await emailRepo.deleteAllForUser("user-no-tokens");
    expect(mockBatch.delete).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// EmailVerificationTokenRepository.findByEmail (blind-index lookup)
// ---------------------------------------------------------------------------
describe("EmailVerificationTokenRepository.findByEmail", () => {
  it("first queries emailIndex (blind index), not raw email", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await emailRepo.findByEmail("ravi@example.com");
    expect(mockCollection.where).toHaveBeenCalledWith(
      "emailIndex",
      "==",
      "blind:ravi@example.com",
    );
  });

  it("falls back to plaintext email lookup when index returns empty", async () => {
    // First call (index) returns empty, second call (email) also empty
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await emailRepo.findByEmail("ravi@example.com");
    // Two where calls — first for emailIndex, second for email
    expect(mockCollection.where).toHaveBeenCalledTimes(2);
  });

  it("does NOT fall back if index returns results", async () => {
    const token = makeEmailToken();
    mockQuery.get.mockResolvedValueOnce(
      makeQuerySnap([{ id: token.id as string, data: token }]),
    );
    await emailRepo.findByEmail("ravi@example.com");
    expect(mockCollection.where).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// EmailVerificationTokenRepository.deleteExpired
// ---------------------------------------------------------------------------
describe("EmailVerificationTokenRepository.deleteExpired", () => {
  it("batch-deletes all expired tokens", async () => {
    const tokens = [makeEmailToken({ id: "t-expired-1" }), makeEmailToken({ id: "t-expired-2" })];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(tokens.map((t) => ({ id: t.id as string, data: t }))),
    );
    const count = await emailRepo.deleteExpired();
    expect(count).toBe(2);
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("queries expiresAt < now", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await emailRepo.deleteExpired();
    expect(mockCollection.where).toHaveBeenCalledWith(
      "expiresAt",
      "<",
      expect.any(Date),
    );
  });
});

// ---------------------------------------------------------------------------
// PasswordResetTokenRepository.markAsUsed
// ---------------------------------------------------------------------------
describe("PasswordResetTokenRepository.markAsUsed", () => {
  it("sets used: true on the token", async () => {
    const token = makePasswordResetToken({ used: false });
    mockDocRef.get.mockResolvedValue(makeSnap(token, "pw-token-abc123"));
    await passwordRepo.markAsUsed("pw-token-abc123");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ used: true }),
    );
  });

  it("sets usedAt timestamp", async () => {
    const token = makePasswordResetToken();
    mockDocRef.get.mockResolvedValue(makeSnap(token, "pw-token-abc123"));
    await passwordRepo.markAsUsed("pw-token-abc123");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
  });

  it("calls doc(tokenId) to target the correct token", async () => {
    const token = makePasswordResetToken();
    mockDocRef.get.mockResolvedValue(makeSnap(token, "pw-token-abc123"));
    await passwordRepo.markAsUsed("pw-token-abc123");
    expect(mockCollection.doc).toHaveBeenCalledWith("pw-token-abc123");
  });
});

// ---------------------------------------------------------------------------
// PasswordResetTokenRepository.findUnusedForUser
// ---------------------------------------------------------------------------
describe("PasswordResetTokenRepository.findUnusedForUser", () => {
  it("returns only tokens where used == false for the user", async () => {
    const unused = makePasswordResetToken({ used: false });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: unused.id as string, data: unused }]),
    );
    const results = await passwordRepo.findUnusedForUser("user-ravi");
    expect(results).toHaveLength(1);
  });

  it("queries userId and used==false filters", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await passwordRepo.findUnusedForUser("user-ravi");
    expect(mockCollection.where).toHaveBeenCalledWith("userId", "==", "user-ravi");
    expect(mockQuery.where).toHaveBeenCalledWith("used", "==", false);
  });

  it("returns empty array when all tokens for user are used", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await passwordRepo.findUnusedForUser("user-ravi");
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PasswordResetTokenRepository.isExpired
// ---------------------------------------------------------------------------
describe("PasswordResetTokenRepository.isExpired", () => {
  it("returns false when expiresAt is in the future", () => {
    const token = makePasswordResetToken({ expiresAt: new Date(Date.now() + 60_000) });
    expect(passwordRepo.isExpired(token as never)).toBe(false);
  });

  it("returns true when expiresAt is in the past", () => {
    const token = makePasswordResetToken({ expiresAt: new Date(Date.now() - 1000) });
    expect(passwordRepo.isExpired(token as never)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PasswordResetTokenRepository.findByEmail (blind-index lookup)
// ---------------------------------------------------------------------------
describe("PasswordResetTokenRepository.findByEmail", () => {
  it("queries by HMAC blind index (not plaintext email)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await passwordRepo.findByEmail("ravi@example.com");
    expect(mockCollection.where).toHaveBeenCalledWith(
      "emailIndex",
      "==",
      "blind:ravi@example.com",
    );
  });

  it("does not expose raw email in the Firestore query field", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await passwordRepo.findByEmail("ravi@example.com");
    // First call is index lookup — must NOT use raw email
    const firstCallArg = (mockCollection.where.mock.calls[0] as [string, string, string])[2];
    expect(firstCallArg).not.toBe("ravi@example.com");
    expect(firstCallArg).toMatch(/^blind:/);
  });
});
