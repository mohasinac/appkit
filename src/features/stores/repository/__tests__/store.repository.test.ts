import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";
import { DatabaseError } from "../../../../errors";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
  };
});

vi.mock("../../../../security/settings-encryption", () => ({
  encryptSecret: (v: string) => `enc:${v}`,
  decryptSecret: (v: string) => v.replace(/^enc:/, ""),
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { StoreRepository } from "../store.repository";

const repo = new StoreRepository();

function makeStoreDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "store-test",
    storeSlug: "store-test",
    ownerId: "uid-seller-1",
    storeName: "Test Store",
    status: "active",
    isPublic: true,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 0, averageRating: 0 },
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    storeSlug: "store-test",
    ownerId: "uid-seller-1",
    storeName: "Test Store",
    status: "pending" as const,
    isPublic: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.create.mockResolvedValue(undefined);
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  db.batch.mockReturnValue(mockBatch);
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("StoreRepository.create", () => {
  it("throws when storeSlug equals ownerId", async () => {
    const input = makeCreateInput({ storeSlug: "uid-same", ownerId: "uid-same" });
    await expect(repo.create(input as never)).rejects.toThrow(DatabaseError);
  });

  it("creates document using .create() semantics (not .set())", async () => {
    await repo.create(makeCreateInput() as never);
    expect(mockDocRef.create).toHaveBeenCalledOnce();
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });

  it("sets document ID to storeSlug", async () => {
    await repo.create(makeCreateInput({ storeSlug: "store-pokemon-palace" }) as never);
    expect(mockCollection.doc).toHaveBeenCalledWith("store-pokemon-palace");
  });

  it("throws DatabaseError(slug already taken) when .create() fails with gRPC code 6", async () => {
    const grpcAlreadyExists = Object.assign(new Error("ALREADY_EXISTS"), { code: 6 });
    mockDocRef.create.mockRejectedValue(grpcAlreadyExists);
    await expect(repo.create(makeCreateInput({ storeSlug: "store-taken" }) as never)).rejects.toThrow(
      DatabaseError,
    );
  });

  it("re-throws non-ALREADY_EXISTS errors as-is", async () => {
    const networkErr = new Error("NETWORK_FAILURE");
    mockDocRef.create.mockRejectedValue(networkErr);
    await expect(repo.create(makeCreateInput() as never)).rejects.toThrow("NETWORK_FAILURE");
  });

  it("returns the store document with id=storeSlug", async () => {
    const result = await repo.create(makeCreateInput({ storeSlug: "store-abc" }) as never);
    expect(result.id).toBe("store-abc");
    expect(result.storeSlug).toBe("store-abc");
  });

  it("encrypts whatsappConfig.accessToken before writing", async () => {
    const input = makeCreateInput({
      whatsappConfig: { accessToken: "secret-token", phoneNumberId: "ph-1", businessId: "biz-1" },
    });
    await repo.create(input as never);
    const callArg = mockDocRef.create.mock.calls[0][0] as Record<string, unknown>;
    const config = callArg.whatsappConfig as Record<string, string>;
    expect(config.accessToken).toBe("enc:secret-token");
  });
});

// ---------------------------------------------------------------------------
// isSlugAvailable
// ---------------------------------------------------------------------------
describe("StoreRepository.isSlugAvailable", () => {
  it("returns true when no document exists for that slug", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.isSlugAvailable("store-new");
    expect(result).toBe(true);
  });

  it("returns false when a document exists for that slug", async () => {
    const store = makeStoreDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(store, "store-test"));
    const result = await repo.isSlugAvailable("store-test");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findByOwnerId
// ---------------------------------------------------------------------------
describe("StoreRepository.findByOwnerId", () => {
  it("returns store when found", async () => {
    const store = makeStoreDoc();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: store.id as string, data: store }]));
    const result = await repo.findByOwnerId("uid-seller-1");
    expect(result).not.toBeNull();
  });

  it("queries by ownerId field", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByOwnerId("uid-seller-1");
    expect(mockCollection.where).toHaveBeenCalledWith("ownerId", "==", "uid-seller-1");
  });

  it("returns null when no store matches", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.findByOwnerId("uid-nobody");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setStatus
// ---------------------------------------------------------------------------
describe("StoreRepository.setStatus", () => {
  it("status=active → sets isPublic: true", async () => {
    const store = makeStoreDoc({ status: "pending", isPublic: false });
    mockDocRef.get.mockResolvedValue(makeSnap(store, "store-test"));
    await repo.setStatus("store-test", "active");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", isPublic: true }),
    );
  });

  it("status=suspended → sets isPublic: false", async () => {
    const store = makeStoreDoc({ status: "active", isPublic: true });
    mockDocRef.get.mockResolvedValue(makeSnap(store, "store-test"));
    await repo.setStatus("store-test", "suspended");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "suspended", isPublic: false }),
    );
  });

  it("status=pending → sets isPublic: false", async () => {
    const store = makeStoreDoc({ status: "active", isPublic: true });
    mockDocRef.get.mockResolvedValue(makeSnap(store, "store-test"));
    await repo.setStatus("store-test", "pending");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", isPublic: false }),
    );
  });

  it("status=rejected → sets isPublic: false", async () => {
    const store = makeStoreDoc({ status: "active", isPublic: true });
    mockDocRef.get.mockResolvedValue(makeSnap(store, "store-test"));
    await repo.setStatus("store-test", "rejected");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false }),
    );
  });
});

// ---------------------------------------------------------------------------
// incrementTotalProducts
// ---------------------------------------------------------------------------
describe("StoreRepository.incrementTotalProducts", () => {
  it("calls update with increment on stats.totalProducts", async () => {
    await repo.incrementTotalProducts("store-1", 1);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.totalProducts": expect.anything() }),
    );
  });

  it("no-op when storeId is empty string", async () => {
    await repo.incrementTotalProducts("", 1);
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it("accepts negative delta (decrement)", async () => {
    await repo.incrementTotalProducts("store-1", -1);
    expect(mockDocRef.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// updateReviewStats
// ---------------------------------------------------------------------------
describe("StoreRepository.updateReviewStats", () => {
  it("updates totalReviews and averageRating on the store doc", async () => {
    await repo.updateReviewStats("store-1", 10, 4.5);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        "stats.totalReviews": 10,
        "stats.averageRating": 4.5,
      }),
    );
  });

  it("no-op when storeId is empty string", async () => {
    await repo.updateReviewStats("", 10, 4.5);
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// changeSlug
// ---------------------------------------------------------------------------
describe("StoreRepository.changeSlug", () => {
  it("throws when currentSlug === newSlug", async () => {
    await expect(repo.changeSlug("store-same", "store-same")).rejects.toThrow(DatabaseError);
  });

  it("throws when newSlug is empty", async () => {
    await expect(repo.changeSlug("store-old", "")).rejects.toThrow(DatabaseError);
  });

  it("throws when newSlug contains invalid characters (uppercase)", async () => {
    await expect(repo.changeSlug("store-old", "Store-BAD")).rejects.toThrow(DatabaseError);
  });

  it("throws when current store is not found", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await expect(repo.changeSlug("store-ghost", "store-new")).rejects.toThrow(DatabaseError);
  });

  it("throws when newSlug is already taken", async () => {
    const currentStore = makeStoreDoc({ storeSlug: "store-old" });
    const takenStore = makeStoreDoc({ storeSlug: "store-taken", id: "store-taken" });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(currentStore, "store-old")) // findById(currentSlug)
      .mockResolvedValueOnce(makeSnap(takenStore, "store-taken")); // isSlugAvailable check
    await expect(repo.changeSlug("store-old", "store-taken")).rejects.toThrow(DatabaseError);
  });

  it("atomically creates new doc and deletes old doc in one batch", async () => {
    const currentStore = makeStoreDoc({ storeSlug: "store-old" });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(currentStore, "store-old")) // findById(currentSlug)
      .mockResolvedValueOnce(makeSnap(null)); // isSlugAvailable(newSlug) → available
    await repo.changeSlug("store-old", "store-new");
    expect(mockBatch.create).toHaveBeenCalledOnce();
    expect(mockBatch.delete).toHaveBeenCalledOnce();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("returns result with id=newSlug and storeSlug=newSlug", async () => {
    const currentStore = makeStoreDoc({ storeSlug: "store-old" });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(currentStore, "store-old"))
      .mockResolvedValueOnce(makeSnap(null));
    const result = await repo.changeSlug("store-old", "store-new");
    expect(result.id).toBe("store-new");
    expect(result.storeSlug).toBe("store-new");
  });

  it("creates new doc at newSlug path, deletes old doc at currentSlug path", async () => {
    const currentStore = makeStoreDoc({ storeSlug: "store-old" });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(currentStore, "store-old"))
      .mockResolvedValueOnce(makeSnap(null));
    await repo.changeSlug("store-old", "store-new");
    // doc() was called for newSlug and currentSlug
    const docCalls = (mockCollection.doc.mock.calls as [string][]).map((c) => c[0]);
    expect(docCalls).toContain("store-new");
    expect(docCalls).toContain("store-old");
  });
});
