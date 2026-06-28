import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

const { mockCacheManager } = vi.hoisted(() => ({
  mockCacheManager: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

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

vi.mock("../../../../contracts/field-ops", () => ({
  serverTimestamp: () => new Date(),
  increment: (n: number) => n,
  arrayUnion: (...args: unknown[]) => args,
  arrayRemove: (...args: unknown[]) => args,
  deleteField: () => null,
  registerFieldOps: vi.fn(),
}));

vi.mock("../../../../core", () => ({
  cacheManager: mockCacheManager,
}));

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// buildSearchTokens returns an array of tokens — mock as passthrough
vi.mock("../../../../utils", () => ({
  generateUniqueId: vi.fn(async (gen: (n: number) => string, exists: (id: string) => Promise<boolean>) => {
    const candidate = gen(0);
    const taken = await exists(candidate);
    return taken ? gen(1) : candidate;
  }),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  buildSearchTokens: (...args: unknown[]) => args.flat().filter(Boolean) as string[],
  tokenizeQuery: (q: string) => q.trim() ? q.trim().toLowerCase().split(/\s+/) : [],
  generateBarcodeId: (id: string) => Promise.resolve(`barcode-${id}`),
}));

import { ProductRepository } from "../products.repository";

const repo = new ProductRepository();

function makeProductDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-charizard-psa9",
    slug: "product-charizard-psa9",
    title: "Charizard PSA 9",
    description: "1st Edition base set Charizard PSA 9",
    brand: "Pokemon",
    brandSlug: "brand-pokemon",
    storeId: "store-pokemon-palace",
    categorySlug: "category-trading-cards",
    categorySlugs: ["category-trading-cards", "category-pokemon"],
    listingType: "standard",
    status: "published",
    price: 50000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    currentBid: 0,
    bidCount: 0,
    viewCount: 0,
    searchTokens: ["charizard", "psa9"],
    barcodeId: "barcode-product-charizard-psa9",
    images: [],
    tags: [],
    features: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCacheManager.get.mockReturnValue(null);
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockCollection.get = vi.fn().mockResolvedValue(makeQuerySnap([]));
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.offset = vi.fn().mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockQuery.count.mockReturnValue({
    get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  });
  mockDocRef.get.mockResolvedValue(makeSnap(makeProductDoc(), "product-charizard-psa9"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  db.batch.mockReturnValue(mockBatch);
  db.getAll = vi.fn().mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// findById — caching
// ---------------------------------------------------------------------------
describe("ProductRepository.findById — caching", () => {
  it("returns cached product without hitting Firestore on warm cache", async () => {
    const cached = makeProductDoc();
    mockCacheManager.get.mockReturnValue(cached);
    const result = await repo.findById("product-charizard-psa9");
    expect(result?.id).toBe("product-charizard-psa9");
    expect(mockDocRef.get).not.toHaveBeenCalled();
  });

  it("fetches from Firestore on cache miss and caches result", async () => {
    mockCacheManager.get.mockReturnValue(null);
    const product = makeProductDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(product, "product-charizard-psa9"));
    await repo.findById("product-charizard-psa9");
    expect(mockDocRef.get).toHaveBeenCalledOnce();
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining("product-charizard-psa9"),
      expect.any(Object),
      expect.objectContaining({ ttl: 30000 }),
    );
  });

  it("returns null when product does not exist (Firestore miss)", async () => {
    mockCacheManager.get.mockReturnValue(null);
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("does NOT cache null results (product not found)", async () => {
    mockCacheManager.get.mockReturnValue(null);
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    await repo.findById("nonexistent");
    expect(mockCacheManager.set).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// delete — cache invalidation
// ---------------------------------------------------------------------------
describe("ProductRepository.delete — cache invalidation", () => {
  it("invalidates cache entry before deleting", async () => {
    await repo.delete("product-charizard-psa9");
    expect(mockCacheManager.delete).toHaveBeenCalledWith(
      expect.stringContaining("product-charizard-psa9"),
    );
    // delete happens before or alongside cache invalidation
    expect(mockDocRef.delete).toHaveBeenCalledOnce();
  });

  it("deletes the Firestore document", async () => {
    await repo.delete("product-charizard-psa9");
    expect(mockDocRef.delete).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("ProductRepository.create", () => {
  beforeEach(() => {
    // After doc.set, findById is called to re-read — return the stored product
    mockDocRef.get.mockResolvedValue(makeSnap(null));
  });

  it("uses title to generate the slug when no explicit slug provided", async () => {
    await repo.create({
      title: "Hot Wheels Redline Vintage",
      storeId: "store-diecast-depot",
      price: 5000,
      currency: "INR",
      stockQuantity: 3,
      listingType: "standard",
    } as never);
    // generateUniqueId calls gen(0) = slugify("Hot Wheels Redline Vintage")
    expect(mockCollection.doc).toHaveBeenCalledWith("hot-wheels-redline-vintage");
  });

  it("uses explicit slug when provided", async () => {
    await repo.create({
      title: "Anything",
      slug: "product-custom-slug",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 1,
      listingType: "standard",
    } as never);
    expect(mockCollection.doc).toHaveBeenCalledWith("product-custom-slug");
  });

  it("builds and stores searchTokens", async () => {
    await repo.create({
      title: "Charizard",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 1,
      listingType: "standard",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(Array.isArray(setArg.searchTokens)).toBe(true);
  });

  it("sets availableQuantity from stockQuantity", async () => {
    await repo.create({
      title: "Test Product",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 5,
      listingType: "standard",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.availableQuantity).toBe(5);
  });

  it("generates barcodeId when not provided", async () => {
    await repo.create({
      title: "New Product",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 1,
      listingType: "standard",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.barcodeId).toBeDefined();
    expect(typeof setArg.barcodeId).toBe("string");
  });

  it("uses provided barcodeId when given", async () => {
    await repo.create({
      title: "New Product",
      barcodeId: "custom-barcode-123",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 1,
      listingType: "standard",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.barcodeId).toBe("custom-barcode-123");
  });

  it("caches the newly created product", async () => {
    await repo.create({
      title: "Cache Me",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 1,
      listingType: "standard",
    } as never);
    expect(mockCacheManager.set).toHaveBeenCalled();
  });

  it("sets createdAt and updatedAt timestamps", async () => {
    await repo.create({
      title: "New Product",
      storeId: "store-1",
      price: 1000,
      currency: "INR",
      stockQuantity: 1,
      listingType: "standard",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.createdAt).toBeInstanceOf(Date);
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// updateBid
// ---------------------------------------------------------------------------
describe("ProductRepository.updateBid", () => {
  it("updates currentBid field", async () => {
    const product = makeProductDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(product, product.id as string));
    await repo.updateBid("product-charizard-psa9", 75000, 5);
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.currentBid).toBe(75000);
  });

  it("updates bidCount field", async () => {
    const product = makeProductDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(product, product.id as string));
    await repo.updateBid("product-charizard-psa9", 75000, 5);
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.bidCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// startGroup
// ---------------------------------------------------------------------------
describe("ProductRepository.startGroup", () => {
  it("sets groupId, isGroupParent: true, and groupChildSlugs: []", async () => {
    await repo.startGroup("product-charizard-psa9", "group-pokemon-starter-bundle");
    expect(mockDocRef.update).toHaveBeenCalledWith({
      groupId: "group-pokemon-starter-bundle",
      isGroupParent: true,
      groupChildSlugs: [],
    });
  });

  it("calls doc(productId) to target the correct product", async () => {
    await repo.startGroup("product-abc", "group-xyz");
    expect(mockCollection.doc).toHaveBeenCalledWith("product-abc");
  });
});

// ---------------------------------------------------------------------------
// dissolveGroup
// ---------------------------------------------------------------------------
describe("ProductRepository.dissolveGroup", () => {
  it("clears groupId and group fields from all members in a batch", async () => {
    const members = [
      makeProductDoc({ id: "product-1", groupId: "group-1" }),
      makeProductDoc({ id: "product-2", groupId: "group-1" }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(members.map((m) => ({ id: m.id as string, data: m }))),
    );
    await repo.dissolveGroup("group-1");
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.every((c) => c[1].groupId === null)).toBe(true);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("does not call batch.update when group has no members", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.dissolveGroup("group-empty");
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("clears all group fields (isGroupParent, groupParentSlug, groupChildSlugs, groupTitle)", async () => {
    const parent = makeProductDoc({ id: "p-1", groupId: "group-1", isGroupParent: true });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "p-1", data: parent }]));
    await repo.dissolveGroup("group-1");
    const updateArg = mockBatch.update.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg.isGroupParent).toBeNull();
    expect(updateArg.groupParentSlug).toBeNull();
    expect(updateArg.groupChildSlugs).toBeNull();
    expect(updateArg.groupTitle).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// linkChildToGroup
// ---------------------------------------------------------------------------
describe("ProductRepository.linkChildToGroup", () => {
  it("batch-updates child with groupId, groupParentSlug", async () => {
    const parent = makeProductDoc({
      id: "product-parent",
      groupId: "group-1",
      groupChildSlugs: [],
      slug: "product-parent",
    });
    const child = makeProductDoc({ id: "product-child", slug: "product-child" });
    await repo.linkChildToGroup(parent as never, child as never);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const childUpdate = calls.find((c) => c[1].groupId === "group-1");
    expect(childUpdate).toBeDefined();
    expect(childUpdate![1].groupParentSlug).toBe("product-parent");
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("appends child id to parent's groupChildSlugs", async () => {
    const parent = makeProductDoc({
      id: "product-parent",
      groupId: "group-1",
      groupChildSlugs: ["product-existing"],
      slug: "product-parent",
    });
    const child = makeProductDoc({ id: "product-new-child", slug: "product-new-child" });
    await repo.linkChildToGroup(parent as never, child as never);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const parentUpdate = calls.find((c) => Array.isArray(c[1].groupChildSlugs));
    expect((parentUpdate![1].groupChildSlugs as string[])).toContain("product-new-child");
    expect((parentUpdate![1].groupChildSlugs as string[])).toContain("product-existing");
  });
});

// ---------------------------------------------------------------------------
// unlinkChildFromGroup
// ---------------------------------------------------------------------------
describe("ProductRepository.unlinkChildFromGroup", () => {
  it("clears child's groupId and groupParentSlug", async () => {
    const parent = makeProductDoc({ id: "p-parent", groupChildSlugs: ["p-child"], slug: "p-parent" });
    const child = makeProductDoc({ id: "p-child", groupId: "group-1", groupParentSlug: "p-parent" });
    await repo.unlinkChildFromGroup(parent as never, child as never);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const childUpdate = calls.find((c) => c[1].groupId === null);
    expect(childUpdate).toBeDefined();
    expect(childUpdate![1].groupParentSlug).toBeNull();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("removes child from parent's groupChildSlugs", async () => {
    const parent = makeProductDoc({
      id: "p-parent",
      groupChildSlugs: ["p-child", "p-other"],
      slug: "p-parent",
    });
    const child = makeProductDoc({ id: "p-child", slug: "p-child" });
    await repo.unlinkChildFromGroup(parent as never, child as never);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const parentUpdate = calls.find((c) => Array.isArray(c[1].groupChildSlugs));
    expect(parentUpdate![1].groupChildSlugs as string[]).not.toContain("p-child");
    expect(parentUpdate![1].groupChildSlugs as string[]).toContain("p-other");
  });
});

// ---------------------------------------------------------------------------
// getExpiredAuctions
// ---------------------------------------------------------------------------
describe("ProductRepository.getExpiredAuctions", () => {
  it("queries listingType==auction, auctionEndDate < now, status==published", async () => {
    const now = new Date();
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getExpiredAuctions(now);
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("listingType"),
      "==",
      "auction",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("auctionEndDate"),
      "<",
      now,
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "==",
      "published",
    );
  });

  it("limits to 500 documents", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getExpiredAuctions(new Date());
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });

  it("returns { id, ref, data } tuples", async () => {
    const auction = makeProductDoc({ id: "auction-expired", listingType: "auction" });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: "auction-expired", data: auction }]),
    );
    const result = await repo.getExpiredAuctions(new Date());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("auction-expired");
    expect(result[0].data).toBeDefined();
    expect(result[0].ref).toBeDefined();
  });

  it("returns empty array when no expired auctions", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.getExpiredAuctions(new Date());
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateStatusInBatch
// ---------------------------------------------------------------------------
describe("ProductRepository.updateStatusInBatch", () => {
  it("stages status update in the caller's batch without committing", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.updateStatusInBatch(callerBatch as never, "product-1", "draft");
    expect(callerBatch.update).toHaveBeenCalledOnce();
    expect(callerBatch.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ status: "draft" }),
    );
    expect(callerBatch.commit).not.toHaveBeenCalled();
  });

  it("sets updatedAt timestamp in the staged update", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.updateStatusInBatch(callerBatch as never, "product-1", "suspended");
    expect(callerBatch.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// incrementBidCountInBatch
// ---------------------------------------------------------------------------
describe("ProductRepository.incrementBidCountInBatch", () => {
  it("stages bid count update without committing", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.incrementBidCountInBatch(callerBatch as never, "auction-1", 5000);
    expect(callerBatch.update).toHaveBeenCalledOnce();
    expect(callerBatch.commit).not.toHaveBeenCalled();
  });

  it("sets currentBid to the provided amount", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.incrementBidCountInBatch(callerBatch as never, "auction-1", 7500);
    expect(callerBatch.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ currentBid: 7500 }),
    );
  });

  it("sets bidsHaveStarted: true on first bid", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.incrementBidCountInBatch(callerBatch as never, "auction-1", 1000);
    expect(callerBatch.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ bidsHaveStarted: true }),
    );
  });

  it("includes leadingBidderId when provided", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.incrementBidCountInBatch(callerBatch as never, "auction-1", 5000, "user-ravi");
    expect(callerBatch.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ leadingBidderId: "user-ravi" }),
    );
  });

  it("does NOT include leadingBidderId when not provided", () => {
    const callerBatch = { update: vi.fn(), commit: vi.fn() };
    repo.incrementBidCountInBatch(callerBatch as never, "auction-1", 5000);
    const updateArg = callerBatch.update.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty("leadingBidderId");
  });
});

// ---------------------------------------------------------------------------
// FILTER_ALIASES — pure function tests
// ---------------------------------------------------------------------------
describe("ProductRepository.FILTER_ALIASES — listingType", () => {
  const aliases = ProductRepository.FILTER_ALIASES;

  it("canonical 'auction' → listingType==auction", () => {
    expect(aliases.listingType!("auction", "==")).toContain("auction");
  });

  it("legacy 'preorder' → normalises to pre-order", () => {
    const result = aliases.listingType!("preorder", "==");
    expect(result).toContain("pre-order");
  });

  it("legacy 'product' → normalises to standard", () => {
    const result = aliases.listingType!("product", "==");
    expect(result).toContain("standard");
  });

  it("'standard' → listingType==standard", () => {
    const result = aliases.listingType!("standard", "==");
    expect(result).toContain("standard");
  });

  it("unknown value → returns empty string (dropped)", () => {
    expect(aliases.listingType!("unknown-type", "==")).toBe("");
  });

  it("!= operator produces listingType!=<value>", () => {
    const result = aliases.listingType!("auction", "!=");
    expect(result).toContain("!=");
    expect(result).toContain("auction");
  });

  it("unsupported operator → returns empty string", () => {
    expect(aliases.listingType!("auction", ">")).toBe("");
  });
});

describe("ProductRepository.FILTER_ALIASES — scope", () => {
  const aliases = ProductRepository.FILTER_ALIASES;

  it("scope==publicProducts → status==published,listingType==standard", () => {
    const result = aliases.scope!("publicProducts", "==");
    expect(result).toContain("status");
    expect(result).toContain("published");
    expect(result).toContain("standard");
  });

  it("scope==publicAuctions → status==published,listingType==auction", () => {
    const result = aliases.scope!("publicAuctions", "==");
    expect(result).toContain("published");
    expect(result).toContain("auction");
  });

  it("scope==published → status==published only", () => {
    const result = aliases.scope!("published", "==");
    expect(result).toContain("published");
    expect(result).not.toContain("listingType");
  });

  it("scope with != operator → returns empty string", () => {
    expect(aliases.scope!("published", "!=")).toBe("");
  });

  it("unknown scope value → returns empty string", () => {
    expect(aliases.scope!("someUnknownScope", "==")).toBe("");
  });
});

describe("ProductRepository.FILTER_ALIASES — other aliases", () => {
  const aliases = ProductRepository.FILTER_ALIASES;

  it("promoted==true → status==published,isPromoted==true", () => {
    const result = aliases.promoted!("true", "==");
    expect(result).toContain("published");
    expect(result).toContain("isPromoted");
  });

  it("promoted==false → returns empty string (not supported)", () => {
    expect(aliases.promoted!("false", "==")).toBe("");
  });

  it("featuredPublic==true → status==published,isFeatured==true", () => {
    const result = aliases.featuredPublic!("true", "==");
    expect(result).toContain("published");
    expect(result).toContain("featured");
  });

  it("category==slug → expands to categorySlugs@=slug (array-contains)", () => {
    const result = aliases.category!("category-trading-cards", "==");
    expect(result).toContain("categorySlugs");
    expect(result).toContain("category-trading-cards");
    expect(result).toContain("@=");
  });
});

// ---------------------------------------------------------------------------
// findByCategory
// ---------------------------------------------------------------------------
describe("ProductRepository.findByCategory", () => {
  it("queries categorySlugs array-contains the category slug", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByCategory("category-trading-cards");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("categorySlugs"),
      "array-contains",
      "category-trading-cards",
    );
  });
});

// ---------------------------------------------------------------------------
// incrementViewCount
// ---------------------------------------------------------------------------
describe("ProductRepository.incrementViewCount", () => {
  it("increments viewCount field (fire-and-forget)", async () => {
    await repo.incrementViewCount("product-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ viewCount: 1 }),
    );
  });

  it("does not throw when Firestore update fails", async () => {
    mockDocRef.update.mockRejectedValue(new Error("Firestore error"));
    await expect(repo.incrementViewCount("product-1")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deleteByStore
// ---------------------------------------------------------------------------
describe("ProductRepository.deleteByStore", () => {
  it("returns 0 when no products exist for the store", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.deleteByStore("store-empty");
    expect(count).toBe(0);
  });

  it("batch-deletes all products for the store and returns count", async () => {
    const products = [
      makeProductDoc({ id: "p-1", storeId: "store-1" }),
      makeProductDoc({ id: "p-2", storeId: "store-1" }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(products.map((p) => ({ id: p.id as string, data: p }))),
    );
    const count = await repo.deleteByStore("store-1");
    expect(count).toBe(2);
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getStaleDraftRefs
// ---------------------------------------------------------------------------
describe("ProductRepository.getStaleDraftRefs", () => {
  it("queries status==draft and updatedAt < cutoff", async () => {
    const cutoff = new Date("2026-01-01");
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getStaleDraftRefs(cutoff);
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "==",
      "draft",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("updatedAt"),
      "<",
      cutoff,
    );
  });

  it("limits to 200 documents", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getStaleDraftRefs(new Date());
    expect(mockQuery.limit).toHaveBeenCalledWith(200);
  });
});
