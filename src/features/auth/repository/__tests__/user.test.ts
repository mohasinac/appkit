import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock security before importing the repo
vi.mock("../../../../security", () => ({
  USER_PII_FIELDS: ["email", "phoneNumber"],
  encryptPiiFields: (data: unknown) => data,
  decryptPiiFields: (data: unknown) => data,
  encryptPayoutDetails: (d: unknown) => d,
  decryptPayoutDetails: (d: unknown) => d,
  encryptShippingConfig: (d: unknown) => d,
  decryptShippingConfig: (d: unknown) => d,
  piiBlindIndex: (v: string) => `idx:${v}`,
}));

vi.mock("../../../../contracts/field-ops", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../contracts/field-ops")>();
  return {
    ...actual,
    increment: (n: number) => n,
    serverTimestamp: () => new Date(),
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
    deleteField: () => null,
  };
});

const mockDocGet = vi.fn();
const mockDocSet = vi.fn();
const mockDocUpdate = vi.fn();
const mockDocRef = { get: mockDocGet, set: mockDocSet, update: mockDocUpdate };
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockQueryGet = vi.fn();
const mockTxGet = vi.fn();
const mockTxUpdate = vi.fn();
const mockTxSet = vi.fn();
const mockRunTransaction = vi.fn();
const mockDoc = vi.fn(() => mockDocRef);
const mockCollectionChain: Record<string, unknown> = {};

const txn = { get: mockTxGet, update: mockTxUpdate, set: mockTxSet };

function makeQueryChain(docs: unknown[] = []) {
  const snap = {
    docs: docs.map((d) => ({ data: () => d, id: (d as { id?: string }).id ?? "doc-id", exists: true })),
    size: docs.length,
    empty: docs.length === 0,
  };
  const chain = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    get: vi.fn().mockResolvedValue(snap),
  };
  return chain;
}

const db = {
  collection: vi.fn((name: string) => {
    if (!mockCollectionChain[name]) {
      const chain = makeQueryChain();
      (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
      mockCollectionChain[name] = chain;
    }
    return mockCollectionChain[name];
  }),
  runTransaction: mockRunTransaction,
};

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async () => {
  const actual = await vi.importActual<typeof import("../../../../providers/db-firebase")>("../../../../providers/db-firebase");
  return {
    ...actual,
    getFirestoreCount: vi.fn().mockResolvedValue(0),
    prepareForFirestore: (d: unknown) => d,
  };
});

import { UserRepository } from "../user.repository";

let repo: UserRepository;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset collection chains
  for (const k of Object.keys(mockCollectionChain)) {
    delete mockCollectionChain[k];
  }
  mockRunTransaction.mockImplementation(async (fn: (txn: { get: typeof mockTxGet; update: typeof mockTxUpdate; set: typeof mockTxSet }) => Promise<void>) => {
    await fn(txn);
  });
  repo = new UserRepository();
});

describe("UserRepository.isEmailRegistered", () => {
  it("returns true when blind-index matches an existing document", async () => {
    const chain = makeQueryChain([{ id: "user-1", email: "enc:test@test.com", emailIndex: "idx:test@test.com", role: "user" }]);
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);

    const result = await repo.isEmailRegistered("test@test.com");
    expect(result).toBe(true);
  });

  it("returns false when no match", async () => {
    const chain = makeQueryChain([]);
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);

    const result = await repo.isEmailRegistered("noone@test.com");
    expect(result).toBe(false);
  });

  it("uses HMAC blind index not plaintext for the query", async () => {
    const chain = makeQueryChain([]);
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);

    await repo.isEmailRegistered("user@example.com");
    // The where clause must use 'idx:user@example.com' (blind index), not the raw email
    expect(chain.where).toHaveBeenCalledWith("emailIndex", "==", "idx:user@example.com");
  });
});

describe("UserRepository.updateLoginMetadata", () => {
  it("uses a Firestore transaction", async () => {
    const chain = makeQueryChain();
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);
    mockDocGet.mockResolvedValue({ data: () => ({ metadata: { loginCount: 3 } }), exists: true });
    mockTxGet.mockResolvedValue({ data: () => ({ metadata: { loginCount: 3 } }), exists: true });

    await repo.updateLoginMetadata("user-1");
    expect(mockRunTransaction).toHaveBeenCalled();
  });

  it("increments loginCount by 1 inside the transaction", async () => {
    const chain = makeQueryChain();
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);
    mockTxGet.mockResolvedValue({ data: () => ({ metadata: { loginCount: 5 } }), exists: true });

    await repo.updateLoginMetadata("user-1");

    const updateArgs = mockTxUpdate.mock.calls[0];
    expect(updateArgs[1]["metadata.loginCount"]).toBe(6);
  });

  it("sets lastSignInTime in the transaction update", async () => {
    const chain = makeQueryChain();
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);
    mockTxGet.mockResolvedValue({ data: () => ({ metadata: { loginCount: 0 } }), exists: true });

    const before = new Date();
    await repo.updateLoginMetadata("user-1");
    const after = new Date();

    const updateArgs = mockTxUpdate.mock.calls[0];
    const signInTime = updateArgs[1]["metadata.lastSignInTime"] as Date;
    expect(signInTime.getTime()).toBeGreaterThanOrEqual(before.getTime() - 10);
    expect(signInTime.getTime()).toBeLessThanOrEqual(after.getTime() + 10);
  });
});

describe("UserRepository.updateProfileWithVerificationReset", () => {
  function setupFindById(userData: Record<string, unknown>) {
    const chain = makeQueryChain();
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);
    mockDocGet.mockResolvedValue({
      exists: true,
      id: "user-1",
      data: () => userData,
    });
    mockDocSet.mockResolvedValue(undefined);
    mockDocUpdate.mockResolvedValue(undefined);
  }

  it("changing email sets emailVerified: false", async () => {
    setupFindById({ email: "old@test.com", phoneNumber: "1111111111", emailVerified: true });

    await repo.updateProfileWithVerificationReset("user-1", { email: "new@test.com" });

    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: false }),
    );
  });

  it("changing phone sets phoneVerified: false", async () => {
    setupFindById({ email: "same@test.com", phoneNumber: "1111111111", phoneVerified: true });

    await repo.updateProfileWithVerificationReset("user-1", { phoneNumber: "2222222222" });

    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ phoneVerified: false }),
    );
  });

  it("changing displayName does NOT reset email or phone verification", async () => {
    setupFindById({ displayName: "Old Name", email: "same@test.com", phoneNumber: "1111111111", emailVerified: true });

    await repo.updateProfileWithVerificationReset("user-1", { displayName: "New Name" });

    const updateArgs = mockDocUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArgs.emailVerified).toBeUndefined();
    expect(updateArgs.phoneVerified).toBeUndefined();
  });
});

describe("UserRepository.findByRole", () => {
  it("queries where role == requested role", async () => {
    const chain = makeQueryChain([]);
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);

    await repo.findByRole("seller");
    expect(chain.where).toHaveBeenCalledWith("role", "==", "seller");
  });
});

describe("UserRepository.countByRole", () => {
  it("returns the Firestore count for the given role", async () => {
    const { getFirestoreCount } = await import("../../../../providers/db-firebase");
    (getFirestoreCount as ReturnType<typeof vi.fn>).mockResolvedValue(7);

    const chain = makeQueryChain([]);
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);

    const count = await repo.countByRole("seller");
    expect(count).toBe(7);
  });
});

describe("UserRepository.create", () => {
  it("generates a human-readable slug ID from name + email", async () => {
    const chain = makeQueryChain();
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);
    mockDocSet.mockResolvedValue(undefined);

    const user = await repo.create({
      uid: "uid-ravi-kumar",
      displayName: "Ravi Kumar",
      email: "ravi@test.com",
      phoneNumber: null,
      photoURL: null,
      role: "user",
      emailVerified: false,
      disabled: false,
    });

    // ID must contain a slug fragment from the name, not a raw UUID
    expect(user.id).toMatch(/ravi/i);
    // ID must NOT be the raw email address
    expect(user.id).not.toContain("ravi@test.com");
  });
});

describe("UserRepository.findByEmail", () => {
  it("uses blind index (idx:email) not plaintext for lookup", async () => {
    const chain = makeQueryChain([]);
    (chain as unknown as { doc: typeof mockDoc }).doc = mockDoc;
    db.collection.mockReturnValue(chain);

    await repo.findByEmail("user@example.com");
    expect(chain.where).toHaveBeenCalledWith("emailIndex", "==", "idx:user@example.com");
  });
});
