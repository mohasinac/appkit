import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
    getFirestoreCount: vi.fn().mockResolvedValue(0),
  };
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

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { UserRepository } from "../user.repository";
import { getFirestoreCount } from "../../../../providers/db-firebase";

const repo = new UserRepository();

function makeUserDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-ravi-kumar",
    displayName: "Ravi Kumar",
    email: "ravi@example.com",
    emailVerified: false,
    role: "user",
    disabled: false,
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
  mockCollection.orderBy = vi.fn().mockReturnValue(mockQuery);
  mockCollection.get = vi.fn().mockResolvedValue(makeQuerySnap([]));
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.offset = vi.fn().mockReturnValue(mockQuery);
  mockQuery.count = vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  });
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(makeUserDoc(), "user-ravi-kumar"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  db.runTransaction.mockImplementation(async (cb: (tx: typeof mockTxn) => Promise<unknown>) => cb(mockTxn));
  mockTxn.get.mockResolvedValue(makeSnap(makeUserDoc(), "user-ravi-kumar"));
  mockTxn.update.mockReturnValue(undefined);
  (getFirestoreCount as ReturnType<typeof vi.fn>).mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("UserRepository.create", () => {
  it("generates a human-readable ID from displayName + email", async () => {
    await repo.create({
      displayName: "Ravi Kumar",
      email: "ravi@example.com",
      role: "user",
    } as never);
    // ID should be based on first/last name — check it was passed to .doc()
    const docCall = mockCollection.doc.mock.calls[0][0] as string;
    expect(docCall).toMatch(/ravi/i);
  });

  it("ID does not contain raw email address (no PII in document ID)", async () => {
    await repo.create({
      displayName: "Ravi Kumar",
      email: "ravi@example.com",
      role: "user",
    } as never);
    const docCall = mockCollection.doc.mock.calls[0][0] as string;
    expect(docCall).not.toContain("ravi@example.com");
    expect(docCall).not.toContain("@");
  });

  it("sets createdAt and updatedAt timestamps on the document", async () => {
    await repo.create({ displayName: "Ravi Kumar", email: "ravi@example.com", role: "user" } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.createdAt).toBeInstanceOf(Date);
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("stores the role from input", async () => {
    await repo.create({ displayName: "Admin", email: "admin@example.com", role: "admin" } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.role).toBe("admin");
  });

  it("returns the document with the generated ID", async () => {
    const result = await repo.create({
      displayName: "Ravi Kumar",
      email: "ravi@example.com",
      role: "user",
    } as never);
    expect(result.id).toBeTruthy();
    expect(result.displayName).toBe("Ravi Kumar");
  });

  it("uses 'user' as firstName fallback when displayName is missing", async () => {
    await repo.create({ email: "ravi@example.com", role: "user" } as never);
    const docCall = mockCollection.doc.mock.calls[0][0] as string;
    expect(docCall).toMatch(/user/i);
  });
});

// ---------------------------------------------------------------------------
// findByEmail — blind index lookup
// ---------------------------------------------------------------------------
describe("UserRepository.findByEmail", () => {
  it("queries emailIndex field using HMAC blind index, not plaintext email", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByEmail("ravi@example.com");
    expect(mockCollection.where).toHaveBeenCalledWith(
      "emailIndex",
      "==",
      "blind:ravi@example.com",
    );
  });

  it("does NOT use raw email in the Firestore query", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByEmail("ravi@example.com");
    const calls = mockCollection.where.mock.calls as [string, string, string][];
    for (const [, , value] of calls) {
      expect(value).not.toBe("ravi@example.com");
    }
  });

  it("returns the user document when found", async () => {
    const user = makeUserDoc();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: user.id as string, data: user }]));
    const result = await repo.findByEmail("ravi@example.com");
    expect(result).not.toBeNull();
    expect(result?.displayName).toBe("Ravi Kumar");
  });

  it("returns null when email is not registered", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.findByEmail("unknown@example.com");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isEmailRegistered
// ---------------------------------------------------------------------------
describe("UserRepository.isEmailRegistered", () => {
  it("returns true when a user with that email exists", async () => {
    const user = makeUserDoc();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: user.id as string, data: user }]));
    const result = await repo.isEmailRegistered("ravi@example.com");
    expect(result).toBe(true);
  });

  it("returns false when no user with that email exists", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.isEmailRegistered("unknown@example.com");
    expect(result).toBe(false);
  });

  it("delegates to findByEmail (uses blind index, not plaintext)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.isEmailRegistered("ravi@example.com");
    expect(mockCollection.where).toHaveBeenCalledWith("emailIndex", "==", "blind:ravi@example.com");
  });
});

// ---------------------------------------------------------------------------
// updateLoginMetadata
// ---------------------------------------------------------------------------
describe("UserRepository.updateLoginMetadata", () => {
  it("uses a Firestore transaction (runTransaction called)", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(makeUserDoc(), "user-ravi-kumar"));
    await repo.updateLoginMetadata("user-ravi-kumar");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("increments loginCount by 1 from current value of 0", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(makeUserDoc({ metadata: { loginCount: 0 } }), "user-ravi-kumar"));
    await repo.updateLoginMetadata("user-ravi-kumar");
    expect(mockTxn.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "metadata.loginCount": 1 }),
    );
  });

  it("increments loginCount by 1 from existing count of 5", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(makeUserDoc({ metadata: { loginCount: 5 } }), "user-ravi-kumar"));
    await repo.updateLoginMetadata("user-ravi-kumar");
    expect(mockTxn.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "metadata.loginCount": 6 }),
    );
  });

  it("sets lastSignInTime to current timestamp", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(makeUserDoc(), "user-ravi-kumar"));
    await repo.updateLoginMetadata("user-ravi-kumar");
    expect(mockTxn.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "metadata.lastSignInTime": expect.any(Date) }),
    );
  });

  it("sets updatedAt to current timestamp", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(makeUserDoc(), "user-ravi-kumar"));
    await repo.updateLoginMetadata("user-ravi-kumar");
    expect(mockTxn.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// updateProfileWithVerificationReset
// ---------------------------------------------------------------------------
describe("UserRepository.updateProfileWithVerificationReset", () => {
  it("sets emailVerified: false when email changes", async () => {
    const user = makeUserDoc({ email: "old@example.com", emailVerified: true });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.updateProfileWithVerificationReset("user-ravi-kumar", {
      email: "new@example.com",
    });
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: false }),
    );
  });

  it("does NOT reset emailVerified when email is unchanged", async () => {
    const user = makeUserDoc({ email: "ravi@example.com", emailVerified: true });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.updateProfileWithVerificationReset("user-ravi-kumar", {
      email: "ravi@example.com",
    });
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.emailVerified).toBeUndefined();
  });

  it("sets phoneVerified: false when phone number changes", async () => {
    const user = makeUserDoc({ phoneNumber: "+911234567890", phoneVerified: true });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.updateProfileWithVerificationReset("user-ravi-kumar", {
      phoneNumber: "+910987654321",
    });
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ phoneVerified: false }),
    );
  });

  it("does NOT reset phoneVerified when phone is unchanged", async () => {
    const user = makeUserDoc({ phoneNumber: "+911234567890", phoneVerified: true });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.updateProfileWithVerificationReset("user-ravi-kumar", {
      phoneNumber: "+911234567890",
    });
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.phoneVerified).toBeUndefined();
  });

  it("changing only displayName does NOT reset email or phone verification", async () => {
    const user = makeUserDoc({ emailVerified: true, phoneVerified: true });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.updateProfileWithVerificationReset("user-ravi-kumar", {
      displayName: "Ravi K",
    });
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.emailVerified).toBeUndefined();
    expect(updateArg.phoneVerified).toBeUndefined();
  });

  it("throws DatabaseError when user does not exist", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(
      repo.updateProfileWithVerificationReset("nonexistent-user", { displayName: "X" }),
    ).rejects.toThrow(/User not found/);
  });
});

// ---------------------------------------------------------------------------
// countByRole
// ---------------------------------------------------------------------------
describe("UserRepository.countByRole", () => {
  it("queries role field with the specified role value", async () => {
    (getFirestoreCount as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    await repo.countByRole("seller");
    expect(mockCollection.where).toHaveBeenCalledWith("role", "==", "seller");
  });

  it("returns the count from getFirestoreCount", async () => {
    (getFirestoreCount as ReturnType<typeof vi.fn>).mockResolvedValue(7);
    const count = await repo.countByRole("admin");
    expect(count).toBe(7);
  });

  it("returns 0 when no users have that role", async () => {
    (getFirestoreCount as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const count = await repo.countByRole("moderator");
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findByRole
// ---------------------------------------------------------------------------
describe("UserRepository.findByRole", () => {
  it("queries users with the specified role", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByRole("seller");
    expect(mockCollection.where).toHaveBeenCalledWith("role", "==", "seller");
  });

  it("returns only users matching the requested role", async () => {
    const seller = makeUserDoc({ id: "user-seller", role: "seller" });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "user-seller", data: seller }]));
    const results = await repo.findByRole("seller");
    expect(results).toHaveLength(1);
    expect(results[0].role).toBe("seller");
  });

  it("returns empty array when no users have the role", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.findByRole("moderator");
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// update — encrypts PII before writing
// ---------------------------------------------------------------------------
describe("UserRepository.update", () => {
  it("calls encryptPiiFields before super.update (passthrough in test = fields unchanged)", async () => {
    const user = makeUserDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.update("user-ravi-kumar", { displayName: "New Name" } as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "New Name" }),
    );
  });

  it("sets updatedAt on every update", async () => {
    const user = makeUserDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.update("user-ravi-kumar", { displayName: "New Name" } as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// markEmailAsVerified
// ---------------------------------------------------------------------------
describe("UserRepository.markEmailAsVerified", () => {
  it("sets emailVerified: true on the user document", async () => {
    const user = makeUserDoc({ emailVerified: false });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.markEmailAsVerified("user-ravi-kumar");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: true }),
    );
  });
});

// ---------------------------------------------------------------------------
// disable / enable
// ---------------------------------------------------------------------------
describe("UserRepository.disable", () => {
  it("sets disabled: true on the user document", async () => {
    const user = makeUserDoc({ disabled: false });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.disable("user-ravi-kumar");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
    );
  });
});

describe("UserRepository.enable", () => {
  it("sets disabled: false on the user document", async () => {
    const user = makeUserDoc({ disabled: true });
    mockDocRef.get.mockResolvedValue(makeSnap(user, "user-ravi-kumar"));
    await repo.enable("user-ravi-kumar");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: false }),
    );
  });
});
