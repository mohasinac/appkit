import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";
import { ValidationError } from "../../../../errors";

const { db, mockDocRef, mockCollection, mockQuery } = makeMockDb();

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

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ProductFeaturesRepository } from "../product-features.repository";
import { MAX_STORE_CUSTOM_FEATURES } from "../../schemas/product-features";

const repo = new ProductFeaturesRepository();

function makeFeatureDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "feature-free-shipping",
    slug: "feature-free-shipping",
    label: "Free Shipping",
    description: "This item ships for free",
    icon: "truck",
    scope: "platform" as const,
    storeId: undefined,
    productTypes: ["all"],
    displayOrder: 0,
    isActive: true,
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
  mockDocRef.get.mockResolvedValue(makeSnap(makeFeatureDoc(), "feature-free-shipping"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.generateId", () => {
  it("generates ID with feature- prefix", () => {
    const id = repo.generateId("Free Shipping");
    expect(id).toMatch(/^feature-/);
  });

  it("slugifies the label (spaces → hyphens, lowercase)", () => {
    const id = repo.generateId("Free Shipping");
    expect(id).toBe("feature-free-shipping");
  });

  it("does not double-prefix when label already starts with feature-", () => {
    const id = repo.generateId("feature-checkout");
    expect(id).toBe("feature-checkout");
    expect(id).not.toContain("feature-feature-");
  });

  it("strips special characters from label", () => {
    const id = repo.generateId("Fast & Reliable!");
    expect(id).not.toContain("&");
    expect(id).not.toContain("!");
    expect(id).toMatch(/^feature-/);
  });
});

// ---------------------------------------------------------------------------
// create — scope validations
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.create — scope validations", () => {
  it("throws ValidationError when scope=store and storeId is not provided", async () => {
    await expect(
      repo.create({
        label: "Custom Badge",
        description: "A store badge",
        icon: "star",
        scope: "store",
        productTypes: ["all"],
        displayOrder: 0,
        isActive: true,
      } as never),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when scope=platform and storeId is provided", async () => {
    await expect(
      repo.create({
        label: "Platform Badge",
        description: "A platform badge",
        icon: "award",
        scope: "platform",
        storeId: "store-pokemon-palace",
        productTypes: ["all"],
        displayOrder: 0,
        isActive: true,
      } as never),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when store feature count reaches MAX_STORE_CUSTOM_FEATURES", async () => {
    // countByStore will query and return snap with size = MAX_STORE_CUSTOM_FEATURES
    mockQuery.get.mockResolvedValue({ size: MAX_STORE_CUSTOM_FEATURES, docs: [], empty: false });
    await expect(
      repo.create({
        label: "One Too Many",
        description: "Exceeds limit",
        icon: "x",
        scope: "store",
        storeId: "store-pokemon-palace",
        productTypes: ["all"],
        displayOrder: 0,
        isActive: true,
      } as never),
    ).rejects.toThrow(ValidationError);
  });

  it("does NOT throw when store feature count is below MAX_STORE_CUSTOM_FEATURES", async () => {
    mockQuery.get.mockResolvedValue({ size: MAX_STORE_CUSTOM_FEATURES - 1, docs: [], empty: false });
    // After count check, doc().get() for findByIdOrFail
    mockDocRef.get.mockResolvedValue(makeSnap(makeFeatureDoc({ scope: "store", storeId: "store-1" }), "feature-custom-badge"));
    await expect(
      repo.create({
        label: "Custom Badge",
        description: "A store badge",
        icon: "star",
        scope: "store",
        storeId: "store-pokemon-palace",
        productTypes: ["all"],
        displayOrder: 0,
        isActive: true,
      } as never),
    ).resolves.toBeDefined();
  });

  it("platform scope with no storeId creates the feature successfully", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(makeFeatureDoc(), "feature-free-shipping"));
    await expect(
      repo.create({
        label: "Free Shipping",
        description: "Ships for free",
        icon: "truck",
        scope: "platform",
        productTypes: ["all"],
        displayOrder: 0,
        isActive: true,
      } as never),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// create — field storage
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.create — field storage", () => {
  it("uses generated ID from label as document ID", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(makeFeatureDoc(), "feature-fast-checkout"));
    await repo.create({
      label: "Fast Checkout",
      description: "Quick buy",
      icon: "zap",
      scope: "platform",
      productTypes: ["all"],
      displayOrder: 1,
      isActive: true,
    } as never);
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "feature-fast-checkout" }),
    );
  });

  it("sets createdAt and updatedAt timestamps", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(makeFeatureDoc(), "feature-fast-checkout"));
    await repo.create({
      label: "Fast Checkout",
      description: "Quick buy",
      icon: "zap",
      scope: "platform",
      productTypes: ["all"],
      displayOrder: 1,
      isActive: true,
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.createdAt).toBeInstanceOf(Date);
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.delete", () => {
  it("throws ValidationError when a product references the feature", async () => {
    // The where chain for the product reference check returns a non-empty snap
    mockQuery.get.mockResolvedValueOnce({ empty: false, size: 1, docs: [{ id: "prod-1" }] });
    await expect(repo.delete("feature-free-shipping")).rejects.toThrow(ValidationError);
  });

  it("deletes the feature when no product references it", async () => {
    mockQuery.get.mockResolvedValueOnce(makeQuerySnap([]));
    await expect(repo.delete("feature-free-shipping")).resolves.toBeUndefined();
    expect(mockDocRef.delete).toHaveBeenCalledOnce();
  });

  it("limits the product reference check to 1 document (efficiency)", async () => {
    mockQuery.get.mockResolvedValueOnce(makeQuerySnap([]));
    await repo.delete("feature-free-shipping");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });

  it("does not delete the feature when a product references it", async () => {
    mockQuery.get.mockResolvedValueOnce({ empty: false, size: 1, docs: [{ id: "prod-1" }] });
    try {
      await repo.delete("feature-free-shipping");
    } catch {
      // expected
    }
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// countByStore
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.countByStore", () => {
  it("returns snap.size as the count", async () => {
    mockQuery.get.mockResolvedValue({ size: 3, docs: [], empty: false });
    const count = await repo.countByStore("store-pokemon-palace");
    expect(count).toBe(3);
  });

  it("returns 0 when no store features exist", async () => {
    mockQuery.get.mockResolvedValue({ size: 0, docs: [], empty: true });
    const count = await repo.countByStore("store-no-features");
    expect(count).toBe(0);
  });

  it("filters by scope=store and storeId", async () => {
    mockQuery.get.mockResolvedValue({ size: 0, docs: [], empty: true });
    await repo.countByStore("store-pokemon-palace");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("scope"),
      "==",
      "store",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("storeId"),
      "==",
      "store-pokemon-palace",
    );
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.update", () => {
  it("updates provided fields plus updatedAt", async () => {
    await repo.update("feature-free-shipping", { label: "Free Delivery", isActive: false } as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Free Delivery", isActive: false, updatedAt: expect.any(Date) }),
    );
  });

  it("calls doc(id) to target the correct feature", async () => {
    await repo.update("feature-abc", { label: "Updated" } as never);
    expect(mockCollection.doc).toHaveBeenCalledWith("feature-abc");
  });
});

// ---------------------------------------------------------------------------
// listFiltered
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.listFiltered", () => {
  it("applies scope filter when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listFiltered({ scope: "platform" });
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("scope"),
      "==",
      "platform",
    );
  });

  it("applies storeId filter when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listFiltered({ storeId: "store-1" });
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("storeId"),
      "==",
      "store-1",
    );
  });

  it("applies isActive filter when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listFiltered({ isActive: true });
    expect(mockCollection.where).toHaveBeenCalledWith("isActive", "==", true);
  });

  it("filters by productType in-memory (not Firestore)", async () => {
    const feature1 = makeFeatureDoc({ id: "f-1", productTypes: ["all"] });
    const feature2 = makeFeatureDoc({ id: "f-2", productTypes: ["product"] });
    const feature3 = makeFeatureDoc({ id: "f-3", productTypes: ["auction"] });
    // No Firestore filters applied for productType-only query → uses mockCollection.get
    (mockCollection.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeQuerySnap([
        { id: "f-1", data: feature1 },
        { id: "f-2", data: feature2 },
        { id: "f-3", data: feature3 },
      ]),
    );
    const results = await repo.listFiltered({ productType: "product" });
    // "all" matches everything; "product" matches "product"; "auction" does NOT match "product"
    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("f-1");
    expect(ids).toContain("f-2");
    expect(ids).not.toContain("f-3");
  });

  it("returns results sorted by displayOrder ascending", async () => {
    const features = [
      makeFeatureDoc({ id: "f-b", displayOrder: 2 }),
      makeFeatureDoc({ id: "f-a", displayOrder: 0 }),
      makeFeatureDoc({ id: "f-c", displayOrder: 5 }),
    ];
    // No Firestore filters → uses mockCollection.get
    (mockCollection.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeQuerySnap(features.map((f) => ({ id: f.id as string, data: f }))),
    );
    const results = await repo.listFiltered({});
    expect(results[0].id).toBe("f-a");
    expect(results[1].id).toBe("f-b");
    expect(results[2].id).toBe("f-c");
  });

  it("returns empty array when no features match", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.listFiltered({ scope: "store", storeId: "store-empty" });
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listPlatform
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.listPlatform", () => {
  it("calls listFiltered with scope=platform and isActive=true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listPlatform();
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("scope"),
      "==",
      "platform",
    );
    expect(mockCollection.where).toHaveBeenCalledWith("isActive", "==", true);
  });
});

// ---------------------------------------------------------------------------
// listForStore
// ---------------------------------------------------------------------------
describe("ProductFeaturesRepository.listForStore", () => {
  it("calls listFiltered with scope=store, storeId, and isActive=true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listForStore("store-pokemon-palace");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("storeId"),
      "==",
      "store-pokemon-palace",
    );
    expect(mockCollection.where).toHaveBeenCalledWith("isActive", "==", true);
  });
});
