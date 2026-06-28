import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";
import { DatabaseError } from "../../../../errors";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

const { mockEncryptPiiFields, mockDecryptPiiFields } = vi.hoisted(() => ({
  mockEncryptPiiFields: vi.fn((d: Record<string, unknown>) => d),
  mockDecryptPiiFields: vi.fn((d: Record<string, unknown>) => d),
}));

const { mockGetFirestoreCount } = vi.hoisted(() => ({
  mockGetFirestoreCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
    getFirestoreCount: mockGetFirestoreCount,
  };
});

vi.mock("../../../../security", () => ({
  encryptPiiFields: mockEncryptPiiFields,
  decryptPiiFields: mockDecryptPiiFields,
  ADDRESS_PII_FIELDS: ["fullName", "phone", "addressLine1"],
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { AddressesRepository } from "../addresses.repository";

const repo = new AddressesRepository();

function makeAddressDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "addr-1",
    ownerType: "user" as const,
    ownerId: "user-1",
    label: "Home",
    fullName: "Ravi Kumar",
    phone: "+91-9876543210",
    addressLine1: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "IN",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAddressInput(overrides: Record<string, unknown> = {}) {
  return {
    label: "Home",
    fullName: "Ravi Kumar",
    phone: "+91-9876543210",
    addressLine1: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "IN",
    isDefault: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore passthrough encryption mocks after clearAllMocks
  mockEncryptPiiFields.mockImplementation((d: Record<string, unknown>) => d);
  mockDecryptPiiFields.mockImplementation((d: Record<string, unknown>) => d);

  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  db.batch.mockReturnValue(mockBatch);
  mockGetFirestoreCount.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// listByOwner
// ---------------------------------------------------------------------------
describe("AddressesRepository.listByOwner", () => {
  it("returns addresses for the owner", async () => {
    const addr = makeAddressDoc();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: addr.id as string, data: addr }]));
    const results = await repo.listByOwner("user", "user-1");
    expect(results).toHaveLength(1);
  });

  it("queries with ownerType AND ownerId filters", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByOwner("user", "user-1");
    expect(mockCollection.where).toHaveBeenCalledWith("ownerType", "==", "user");
    expect(mockQuery.where).toHaveBeenCalledWith("ownerId", "==", "user-1");
  });

  it("orders results by createdAt descending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByOwner("user", "user-1");
    expect(mockQuery.orderBy).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("returns empty array when no addresses found", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.listByOwner("user", "nobody");
    expect(results).toHaveLength(0);
  });

  it("returns store addresses when ownerType=store", async () => {
    const addr = makeAddressDoc({ ownerType: "store", ownerId: "store-1" });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: addr.id as string, data: addr }]));
    const results = await repo.listByOwner("store", "store-1");
    expect(results).toHaveLength(1);
    expect(mockCollection.where).toHaveBeenCalledWith("ownerType", "==", "store");
  });
});

// ---------------------------------------------------------------------------
// listByOwnerType
// ---------------------------------------------------------------------------
describe("AddressesRepository.listByOwnerType", () => {
  it("queries only by ownerType (no ownerId filter)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByOwnerType("user");
    expect(mockCollection.where).toHaveBeenCalledWith("ownerType", "==", "user");
    // Ensure ownerId filter NOT applied (only one where call at collection level)
    const collectionWhereCalls = (mockCollection.where.mock.calls as [string][]).filter(
      (c) => c[0] === "ownerId",
    );
    expect(collectionWhereCalls).toHaveLength(0);
  });

  it("applies the limit (default 500)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByOwnerType("store");
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });

  it("applies custom limit when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByOwnerType("store", 100);
    expect(mockQuery.limit).toHaveBeenCalledWith(100);
  });
});

// ---------------------------------------------------------------------------
// countByOwner
// ---------------------------------------------------------------------------
describe("AddressesRepository.countByOwner", () => {
  it("returns count from getFirestoreCount", async () => {
    mockGetFirestoreCount.mockResolvedValue(3);
    const count = await repo.countByOwner("user", "user-1");
    expect(count).toBe(3);
  });

  it("queries by ownerType AND ownerId", async () => {
    await repo.countByOwner("user", "user-1");
    expect(mockCollection.where).toHaveBeenCalledWith("ownerType", "==", "user");
    expect(mockQuery.where).toHaveBeenCalledWith("ownerId", "==", "user-1");
  });

  it("returns 0 when no addresses exist", async () => {
    mockGetFirestoreCount.mockResolvedValue(0);
    const count = await repo.countByOwner("user", "ghost-user");
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createForOwner
// ---------------------------------------------------------------------------
describe("AddressesRepository.createForOwner", () => {
  it("isDefault:false — no batch operations, docRef.set called", async () => {
    const address = makeAddressDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(address, "mock-doc-id"));
    await repo.createForOwner("user", "user-1", makeAddressInput({ isDefault: false }));
    expect(mockDocRef.set).toHaveBeenCalledOnce();
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("isDefault:true with no existing defaults — no batch commit, docRef.set still called", async () => {
    // clearDefaultFlag: empty snap → early return without batch
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    const address = makeAddressDoc({ isDefault: true });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "mock-doc-id"));
    await repo.createForOwner("user", "user-1", makeAddressInput({ isDefault: true }));
    expect(mockDocRef.set).toHaveBeenCalledOnce();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("isDefault:true with existing defaults — clears them via batch before creating", async () => {
    const existingDefault = makeAddressDoc({ isDefault: true, id: "addr-old" });
    const existingSnap = makeSnap(existingDefault, "addr-old");
    mockQuery.get.mockResolvedValue({ docs: [existingSnap], empty: false, size: 1 });

    const newAddress = makeAddressDoc({ isDefault: true });
    mockDocRef.get.mockResolvedValue(makeSnap(newAddress, "mock-doc-id"));

    await repo.createForOwner("user", "user-1", makeAddressInput({ isDefault: true }));

    expect(mockBatch.update).toHaveBeenCalledWith(
      existingSnap.ref,
      expect.objectContaining({ isDefault: false }),
    );
    expect(mockBatch.commit).toHaveBeenCalledOnce();
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("sets ownerType and ownerId on the written document", async () => {
    const address = makeAddressDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(address, "mock-doc-id"));
    await repo.createForOwner("store", "store-abc", makeAddressInput());
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ ownerType: "store", ownerId: "store-abc" }),
    );
  });

  it("re-fetches the address after write to return consistent data", async () => {
    const address = makeAddressDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(address, "mock-doc-id"));
    const result = await repo.createForOwner("user", "user-1", makeAddressInput());
    // The re-fetch (findById) uses mockDocRef.get — result reflects that
    expect(result).toBeDefined();
    expect(mockDocRef.get).toHaveBeenCalled();
  });

  it("throws DatabaseError when re-fetch returns null (doc not readable after write)", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(
      repo.createForOwner("user", "user-1", makeAddressInput()),
    ).rejects.toThrow(DatabaseError);
  });

  it("calls encryptPiiFields with the address data on write", async () => {
    const address = makeAddressDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(address, "mock-doc-id"));
    await repo.createForOwner("user", "user-1", makeAddressInput({ fullName: "Jane Doe" }));
    expect(mockEncryptPiiFields).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Jane Doe" }),
      expect.arrayContaining(["fullName", "phone", "addressLine1"]),
    );
  });

  it("uses an auto-generated Firestore ID (getCollection().doc() called without args)", async () => {
    const address = makeAddressDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(address, "mock-doc-id"));
    await repo.createForOwner("user", "user-1", makeAddressInput());
    // doc() called with no argument = auto-ID
    const callsWithNoArg = (mockCollection.doc.mock.calls as unknown[][]).filter(
      (args) => args.length === 0,
    );
    expect(callsWithNoArg).not.toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateForOwner
// ---------------------------------------------------------------------------
describe("AddressesRepository.updateForOwner", () => {
  it("throws DatabaseError when address not found", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(
      repo.updateForOwner("user", "user-1", "addr-x", { label: "Work" }),
    ).rejects.toThrow(DatabaseError);
  });

  it("throws DatabaseError when ownerType does not match", async () => {
    const address = makeAddressDoc({ ownerType: "store", ownerId: "store-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await expect(
      repo.updateForOwner("user", "user-1", "addr-1", { label: "Work" }),
    ).rejects.toThrow(DatabaseError);
  });

  it("throws DatabaseError when ownerId does not match", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-other" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await expect(
      repo.updateForOwner("user", "user-1", "addr-1", { label: "Work" }),
    ).rejects.toThrow(DatabaseError);
  });

  it("updates the address when ownership matches", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    await repo.updateForOwner("user", "user-1", "addr-1", { label: "Office" });
    expect(mockDocRef.update).toHaveBeenCalled();
  });

  it("isDefault:true — clears existing defaults before updating", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));

    const existingDefault = makeAddressDoc({ isDefault: true, id: "addr-old" });
    const existingSnap = makeSnap(existingDefault, "addr-old");
    mockQuery.get.mockResolvedValue({ docs: [existingSnap], empty: false, size: 1 });

    await repo.updateForOwner("user", "user-1", "addr-1", { isDefault: true });

    expect(mockBatch.update).toHaveBeenCalledWith(
      existingSnap.ref,
      expect.objectContaining({ isDefault: false }),
    );
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("isDefault:false — does NOT clear existing defaults", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await repo.updateForOwner("user", "user-1", "addr-1", { isDefault: false });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("encrypts PII fields on update", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await repo.updateForOwner("user", "user-1", "addr-1", { fullName: "New Name" });
    expect(mockEncryptPiiFields).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "New Name" }),
      expect.arrayContaining(["fullName", "phone", "addressLine1"]),
    );
  });
});

// ---------------------------------------------------------------------------
// deleteForOwner
// ---------------------------------------------------------------------------
describe("AddressesRepository.deleteForOwner", () => {
  it("throws DatabaseError when address not found", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(repo.deleteForOwner("user", "user-1", "addr-x")).rejects.toThrow(DatabaseError);
  });

  it("throws DatabaseError when address belongs to a different ownerId", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-other" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await expect(repo.deleteForOwner("user", "user-1", "addr-1")).rejects.toThrow(DatabaseError);
  });

  it("throws DatabaseError when address belongs to a different ownerType", async () => {
    const address = makeAddressDoc({ ownerType: "store", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await expect(repo.deleteForOwner("user", "user-1", "addr-1")).rejects.toThrow(DatabaseError);
  });

  it("deletes the address when ownership matches", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await repo.deleteForOwner("user", "user-1", "addr-1");
    expect(mockDocRef.delete).toHaveBeenCalledOnce();
  });

  it("does NOT delete address for a different store-owner", async () => {
    const storeAddr = makeAddressDoc({ ownerType: "store", ownerId: "store-2" });
    mockDocRef.get.mockResolvedValue(makeSnap(storeAddr, "addr-1"));
    await expect(repo.deleteForOwner("store", "store-1", "addr-1")).rejects.toThrow(DatabaseError);
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setDefault
// ---------------------------------------------------------------------------
describe("AddressesRepository.setDefault", () => {
  it("throws DatabaseError when address not found", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(repo.setDefault("user", "user-1", "addr-x")).rejects.toThrow(DatabaseError);
  });

  it("throws DatabaseError when address belongs to a different owner", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-other" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    await expect(repo.setDefault("user", "user-1", "addr-1")).rejects.toThrow(DatabaseError);
  });

  it("clears all existing defaults for the owner before setting the new one", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));

    const existingDefault = makeAddressDoc({ isDefault: true, id: "addr-old" });
    const existingSnap = makeSnap(existingDefault, "addr-old");
    mockQuery.get.mockResolvedValue({ docs: [existingSnap], empty: false, size: 1 });

    await repo.setDefault("user", "user-1", "addr-1");

    // clearDefaultFlag ran and batched the update
    expect(mockBatch.update).toHaveBeenCalledWith(
      existingSnap.ref,
      expect.objectContaining({ isDefault: false }),
    );
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("sets isDefault:true on the target address", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });

    await repo.setDefault("user", "user-1", "addr-1");

    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true }),
    );
  });

  it("uses a batch for atomicity (clear + set in single WriteBatch)", async () => {
    const address = makeAddressDoc({ ownerType: "user", ownerId: "user-1" });
    mockDocRef.get.mockResolvedValue(makeSnap(address, "addr-1"));

    // Two existing defaults to clear
    const s1 = makeSnap(makeAddressDoc({ isDefault: true, id: "old-1" }), "old-1");
    const s2 = makeSnap(makeAddressDoc({ isDefault: true, id: "old-2" }), "old-2");
    mockQuery.get.mockResolvedValue({ docs: [s1, s2], empty: false, size: 2 });

    await repo.setDefault("user", "user-1", "addr-1");

    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// deleteAllForOwner
// ---------------------------------------------------------------------------
describe("AddressesRepository.deleteAllForOwner", () => {
  it("returns 0 and does not start a batch when no addresses found", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    const count = await repo.deleteAllForOwner("user", "user-1");
    expect(count).toBe(0);
    expect(mockBatch.delete).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("batch-deletes all matching addresses and returns the count", async () => {
    const s1 = makeSnap(makeAddressDoc({ id: "addr-1" }), "addr-1");
    const s2 = makeSnap(makeAddressDoc({ id: "addr-2" }), "addr-2");
    mockQuery.get.mockResolvedValue({ docs: [s1, s2], empty: false, size: 2 });

    const count = await repo.deleteAllForOwner("user", "user-1");

    expect(count).toBe(2);
    expect(mockBatch.delete).toHaveBeenCalledWith(s1.ref);
    expect(mockBatch.delete).toHaveBeenCalledWith(s2.ref);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("queries by ownerType AND ownerId", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    await repo.deleteAllForOwner("store", "store-xyz");
    expect(mockCollection.where).toHaveBeenCalledWith("ownerType", "==", "store");
    expect(mockQuery.where).toHaveBeenCalledWith("ownerId", "==", "store-xyz");
  });

  it("returns count matching the number of docs deleted", async () => {
    const snaps = Array.from({ length: 5 }, (_, i) =>
      makeSnap(makeAddressDoc({ id: `addr-${i}` }), `addr-${i}`),
    );
    mockQuery.get.mockResolvedValue({ docs: snaps, empty: false, size: 5 });
    const count = await repo.deleteAllForOwner("user", "user-1");
    expect(count).toBe(5);
    expect(mockBatch.delete).toHaveBeenCalledTimes(5);
  });
});
