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

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { CategoriesRepository } from "../categories.repository";
import { MIN_ITEMS_FOR_FEATURED } from "../../schemas";

const repo = new CategoriesRepository();

function makeCategoryDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "category-action-figures",
    name: "Action Figures",
    slug: "action-figures",
    categoryType: "category",
    tier: 0,
    parentIds: [],
    rootId: "category-action-figures",
    path: "action-figures",
    ancestors: [],
    childrenIds: [],
    isLeaf: true,
    isActive: true,
    isBrand: false,
    isFeatured: false,
    isSearchable: true,
    order: 1,
    metrics: {
      productCount: 0,
      productIds: [],
      auctionCount: 0,
      auctionIds: [],
      totalProductCount: 0,
      totalAuctionCount: 0,
      totalItemCount: 0,
      lastUpdated: new Date(),
    },
    display: {},
    seo: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  // resetAllMocks clears call history AND the mockResolvedValueOnce queue,
  // preventing unconsumed "once" values from bleeding into the next test.
  vi.resetAllMocks();
  db.collection.mockReturnValue(mockCollection);
  db.batch.mockReturnValue(mockBatch);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockCollection.orderBy = vi.fn().mockReturnValue(mockQuery);
  mockCollection.get = vi.fn().mockResolvedValue(makeQuerySnap([]));
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  mockBatch.update.mockReturnValue(undefined);
  mockBatch.delete.mockReturnValue(undefined);
  mockBatch.commit.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createWithHierarchy — root category (no parent)
// ---------------------------------------------------------------------------
describe("CategoriesRepository.createWithHierarchy — root category", () => {
  it("creates a root category with tier 0 when no parentId provided", async () => {
    // No parent lookup (parentIds is empty) — first get is findByIdOrFail at the end
    const createdDoc = makeCategoryDoc({ tier: 0, parentIds: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(createdDoc, createdDoc.id as string));

    const result = await repo.createWithHierarchy({
      name: "Action Figures",
      slug: "action-figures",
      categoryType: "category",
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    expect(result.tier).toBe(0);
  });

  it("sets parentIds: [] for a root category", async () => {
    const createdDoc = makeCategoryDoc({ tier: 0, parentIds: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(createdDoc, createdDoc.id as string));

    const result = await repo.createWithHierarchy({
      name: "Action Figures",
      slug: "action-figures",
      categoryType: "category",
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    expect(result.parentIds).toEqual([]);
  });

  it("sets isLeaf: true on a freshly created root category", async () => {
    const createdDoc = makeCategoryDoc({ isLeaf: true });
    mockDocRef.get.mockResolvedValue(makeSnap(createdDoc, createdDoc.id as string));

    const result = await repo.createWithHierarchy({
      name: "Action Figures",
      slug: "action-figures",
      categoryType: "category",
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    expect(result.isLeaf).toBe(true);
  });

  it("calls db.collection.doc.set to persist the document", async () => {
    const createdDoc = makeCategoryDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(createdDoc, createdDoc.id as string));

    await repo.createWithHierarchy({
      name: "Action Figures",
      slug: "action-figures",
      categoryType: "category",
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("does NOT update any parent's childrenIds when creating a root category", async () => {
    const createdDoc = makeCategoryDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(createdDoc, createdDoc.id as string));

    await repo.createWithHierarchy({
      name: "Action Figures",
      slug: "action-figures",
      categoryType: "category",
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    // update is only called for parent's childrenIds — should NOT be called for root
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createWithHierarchy — child category
// ---------------------------------------------------------------------------
describe("CategoriesRepository.createWithHierarchy — child category", () => {
  const parentDoc = makeCategoryDoc({
    id: "category-action-figures",
    name: "Action Figures",
    tier: 0,
    parentIds: [],
    childrenIds: [],
    rootId: "category-action-figures",
    path: "action-figures",
    ancestors: [],
  });

  it("sets tier = parent.tier + 1 for a child category", async () => {
    const childDoc = makeCategoryDoc({
      id: "category-marvel",
      name: "Marvel",
      tier: 1,
      parentIds: ["category-action-figures"],
    });
    // First get: parent lookup (findById), second get: findByIdOrFail for return
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(parentDoc, "category-action-figures"))
      .mockResolvedValueOnce(makeSnap(childDoc, "category-marvel"));

    const result = await repo.createWithHierarchy({
      name: "Marvel",
      slug: "marvel",
      categoryType: "category",
      parentIds: ["category-action-figures"],
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    expect(result.tier).toBe(1);
  });

  it("includes parentId in parentIds for a child category", async () => {
    const childDoc = makeCategoryDoc({
      id: "category-marvel",
      name: "Marvel",
      tier: 1,
      parentIds: ["category-action-figures"],
    });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(parentDoc, "category-action-figures"))
      .mockResolvedValueOnce(makeSnap(childDoc, "category-marvel"));

    const result = await repo.createWithHierarchy({
      name: "Marvel",
      slug: "marvel",
      categoryType: "category",
      parentIds: ["category-action-figures"],
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    expect(result.parentIds).toContain("category-action-figures");
  });

  it("updates parent's childrenIds to include the new child", async () => {
    const childDoc = makeCategoryDoc({
      id: "category-marvel",
      name: "Marvel",
      tier: 1,
      parentIds: ["category-action-figures"],
    });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(parentDoc, "category-action-figures"))
      .mockResolvedValueOnce(makeSnap(childDoc, "category-marvel"));

    await repo.createWithHierarchy({
      name: "Marvel",
      slug: "marvel",
      categoryType: "category",
      parentIds: ["category-action-figures"],
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    // Should call update on parent — childrenIds gets the new child's ID appended
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        childrenIds: expect.any(Array),
        isLeaf: false,
      }),
    );
  });

  it("sets isLeaf: false on parent after adding child", async () => {
    const childDoc = makeCategoryDoc({
      id: "category-marvel",
      name: "Marvel",
      tier: 1,
      parentIds: ["category-action-figures"],
    });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(parentDoc, "category-action-figures"))
      .mockResolvedValueOnce(makeSnap(childDoc, "category-marvel"));

    await repo.createWithHierarchy({
      name: "Marvel",
      slug: "marvel",
      categoryType: "category",
      parentIds: ["category-action-figures"],
      isActive: true,
      isBrand: false,
      isSearchable: true,
      order: 1,
      display: {},
      seo: {},
    } as never);

    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.isLeaf).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRootCategories
// ---------------------------------------------------------------------------
describe("CategoriesRepository.getRootCategories", () => {
  it("queries tier == 0 and isActive == true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getRootCategories();
    expect(mockCollection.where).toHaveBeenCalledWith("tier", "==", 0);
    expect(mockQuery.where).toHaveBeenCalledWith("isActive", "==", true);
  });

  it("orders by order asc", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getRootCategories();
    expect(mockQuery.orderBy).toHaveBeenCalledWith("order", "asc");
  });

  it("excludes categories with isBrand: true", async () => {
    const regularCat = makeCategoryDoc({ id: "cat-1", isBrand: false, tier: 0 });
    const brandCat = makeCategoryDoc({ id: "cat-brand", isBrand: true, tier: 0 });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([
        { id: "cat-1", data: regularCat },
        { id: "cat-brand", data: brandCat },
      ]),
    );

    const results = await repo.getRootCategories();
    expect(results.every((c) => !c.isBrand)).toBe(true);
    expect(results.some((c) => c.id === "cat-1")).toBe(true);
    expect(results.some((c) => c.id === "cat-brand")).toBe(false);
  });

  it("returns empty array when no root categories exist", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.getRootCategories();
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getLeafCategories
// ---------------------------------------------------------------------------
describe("CategoriesRepository.getLeafCategories", () => {
  it("queries isLeaf == true and isActive == true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getLeafCategories();
    expect(mockCollection.where).toHaveBeenCalledWith("isLeaf", "==", true);
    expect(mockQuery.where).toHaveBeenCalledWith("isActive", "==", true);
  });

  it("limits to 500 documents", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getLeafCategories();
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });

  it("returns matching leaf categories", async () => {
    const leaf = makeCategoryDoc({ id: "cat-leaf", isLeaf: true, isActive: true });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "cat-leaf", data: leaf }]));
    const results = await repo.getLeafCategories();
    expect(results).toHaveLength(1);
    expect(results[0].isLeaf).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toggleFeatured
// ---------------------------------------------------------------------------
describe("CategoriesRepository.toggleFeatured", () => {
  it("throws DatabaseError when totalItemCount < MIN_ITEMS_FOR_FEATURED", async () => {
    const cat = makeCategoryDoc({
      id: "cat-sparse",
      metrics: {
        productCount: 0,
        productIds: [],
        auctionCount: 0,
        auctionIds: [],
        totalProductCount: 0,
        totalAuctionCount: 0,
        totalItemCount: MIN_ITEMS_FOR_FEATURED - 1,
        lastUpdated: new Date(),
      },
    });
    // findByIdOrFail call + return value at end
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(cat, "cat-sparse"))
      .mockResolvedValueOnce(makeSnap(cat, "cat-sparse"));

    await expect(repo.toggleFeatured("cat-sparse", true)).rejects.toThrow(
      /at least/i,
    );
  });

  it("throws when totalItemCount is exactly 0", async () => {
    const cat = makeCategoryDoc({
      id: "cat-empty",
      metrics: {
        productCount: 0,
        productIds: [],
        auctionCount: 0,
        auctionIds: [],
        totalProductCount: 0,
        totalAuctionCount: 0,
        totalItemCount: 0,
        lastUpdated: new Date(),
      },
    });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(cat, "cat-empty"))
      .mockResolvedValueOnce(makeSnap(cat, "cat-empty"));

    await expect(repo.toggleFeatured("cat-empty", true)).rejects.toThrow();
  });

  it("allows featuring when totalItemCount >= MIN_ITEMS_FOR_FEATURED", async () => {
    const cat = makeCategoryDoc({
      id: "cat-rich",
      isFeatured: false,
      metrics: {
        productCount: MIN_ITEMS_FOR_FEATURED,
        productIds: [],
        auctionCount: 0,
        auctionIds: [],
        totalProductCount: MIN_ITEMS_FOR_FEATURED,
        totalAuctionCount: 0,
        totalItemCount: MIN_ITEMS_FOR_FEATURED,
        lastUpdated: new Date(),
      },
    });
    const featured = { ...cat, isFeatured: true };
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(cat, "cat-rich"))
      .mockResolvedValueOnce(makeSnap(featured, "cat-rich"));

    const result = await repo.toggleFeatured("cat-rich", true);
    expect(result.isFeatured).toBe(true);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isFeatured: true }),
    );
  });

  it("allows UN-featuring regardless of totalItemCount (no guard when featured=false)", async () => {
    const cat = makeCategoryDoc({
      id: "cat-unfeature",
      isFeatured: true,
      metrics: {
        productCount: 0,
        productIds: [],
        auctionCount: 0,
        auctionIds: [],
        totalProductCount: 0,
        totalAuctionCount: 0,
        totalItemCount: 0,
        lastUpdated: new Date(),
      },
    });
    const unfeatured = { ...cat, isFeatured: false };
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(cat, "cat-unfeature"))
      .mockResolvedValueOnce(makeSnap(unfeatured, "cat-unfeature"));

    const result = await repo.toggleFeatured("cat-unfeature", false);
    expect(result.isFeatured).toBe(false);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isFeatured: false }),
    );
  });
});

// ---------------------------------------------------------------------------
// moveCategory
// ---------------------------------------------------------------------------
describe("CategoriesRepository.moveCategory", () => {
  const oldParent = makeCategoryDoc({
    id: "cat-old-parent",
    name: "Old Parent",
    tier: 0,
    parentIds: [],
    childrenIds: ["cat-child"],
    rootId: "cat-old-parent",
  });
  const newParent = makeCategoryDoc({
    id: "cat-new-parent",
    name: "New Parent",
    tier: 0,
    parentIds: [],
    childrenIds: [],
    rootId: "cat-new-parent",
  });
  const childCat = makeCategoryDoc({
    id: "cat-child",
    name: "Child",
    tier: 1,
    parentIds: ["cat-old-parent"],
    childrenIds: [],
    rootId: "cat-old-parent",
  });

  it("removes the category from old parent's childrenIds via batch", async () => {
    // findByIdOrFail(categoryId) → child
    // findByIdOrFail(newParentId) → new parent
    // findById(oldParentId) → old parent (for isLeaf check)
    // findByIdOrFail(categoryId) → child (return value)
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"))
      .mockResolvedValueOnce(makeSnap(newParent, "cat-new-parent"))
      .mockResolvedValueOnce(makeSnap(oldParent, "cat-old-parent"))
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"));

    await repo.moveCategory({
      categoryId: "cat-child",
      newParentId: "cat-new-parent",
    });

    // batch.update called for: category itself, old parent, new parent
    const updateCalls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const oldParentUpdate = updateCalls.find(
      ([, data]) => data["childrenIds"] !== undefined && Array.isArray(data["childrenIds"]),
    );
    expect(oldParentUpdate).toBeDefined();
  });

  it("adds the category to new parent's childrenIds via batch", async () => {
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"))
      .mockResolvedValueOnce(makeSnap(newParent, "cat-new-parent"))
      .mockResolvedValueOnce(makeSnap(oldParent, "cat-old-parent"))
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"));

    await repo.moveCategory({
      categoryId: "cat-child",
      newParentId: "cat-new-parent",
    });

    const updateCalls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const newParentUpdate = updateCalls.find(
      ([, data]) => data.isLeaf === false,
    );
    expect(newParentUpdate).toBeDefined();
  });

  it("commits the batch after all updates", async () => {
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"))
      .mockResolvedValueOnce(makeSnap(newParent, "cat-new-parent"))
      .mockResolvedValueOnce(makeSnap(oldParent, "cat-old-parent"))
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"));

    await repo.moveCategory({
      categoryId: "cat-child",
      newParentId: "cat-new-parent",
    });

    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("throws DatabaseError when moving a category to itself (circular)", async () => {
    mockDocRef.get.mockResolvedValueOnce(makeSnap(childCat, "cat-child"));

    await expect(
      repo.moveCategory({ categoryId: "cat-child", newParentId: "cat-child" }),
    ).rejects.toThrow(/circular|invalid/i);
  });

  it("marks old parent as isLeaf: true when it has exactly 1 child (the one being moved)", async () => {
    const oldParentWith1Child = { ...oldParent, childrenIds: ["cat-child"] };
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"))
      .mockResolvedValueOnce(makeSnap(newParent, "cat-new-parent"))
      .mockResolvedValueOnce(makeSnap(oldParentWith1Child, "cat-old-parent"))
      .mockResolvedValueOnce(makeSnap(childCat, "cat-child"));

    await repo.moveCategory({
      categoryId: "cat-child",
      newParentId: "cat-new-parent",
    });

    const updateCalls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const leafUpdate = updateCalls.find(([, data]) => data.isLeaf === true);
    expect(leafUpdate).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// buildTree
// ---------------------------------------------------------------------------
describe("CategoriesRepository.buildTree", () => {
  it("fetches all active non-brand categories ordered by tier then order", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.buildTree();
    expect(mockCollection.where).toHaveBeenCalledWith("isActive", "==", true);
    expect(mockQuery.orderBy).toHaveBeenCalledWith("tier", "asc");
  });

  it("returns an empty array when there are no categories", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.buildTree();
    expect(result).toEqual([]);
  });

  it("builds nested tree correctly from flat category list", async () => {
    const root = makeCategoryDoc({
      id: "cat-root",
      name: "Root",
      tier: 0,
      parentIds: [],
      rootId: "cat-root",
      childrenIds: ["cat-child"],
      isBrand: false,
    });
    const child = makeCategoryDoc({
      id: "cat-child",
      name: "Child",
      tier: 1,
      parentIds: ["cat-root"],
      rootId: "cat-root",
      childrenIds: [],
      isBrand: false,
    });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([
        { id: "cat-root", data: root },
        { id: "cat-child", data: child },
      ]),
    );

    const tree = await repo.buildTree();
    // CategoryTreeNode has { category, children, depth }, not a top-level id
    expect(tree.length).toBeGreaterThanOrEqual(1);
    const rootNode = tree.find((n) => n.category.id === "cat-root");
    expect(rootNode).toBeDefined();
  });

  it("filters out isBrand categories from the global tree", async () => {
    const brand = makeCategoryDoc({
      id: "cat-brand",
      name: "Brand Category",
      tier: 0,
      parentIds: [],
      isBrand: true,
    });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: "cat-brand", data: brand }]),
    );

    const tree = await repo.buildTree();
    expect(tree.find((n) => n.category.id === "cat-brand")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// listByType
// ---------------------------------------------------------------------------
describe("CategoriesRepository.listByType", () => {
  it("queries categoryType == the requested type", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByType("sublisting");
    expect(mockCollection.where).toHaveBeenCalledWith("categoryType", "==", "sublisting");
  });

  it("returns only documents matching the requested categoryType", async () => {
    const sublisting = makeCategoryDoc({
      id: "sublisting-holos",
      categoryType: "sublisting",
    });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: "sublisting-holos", data: sublisting }]),
    );

    const results = await repo.listByType("sublisting");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("sublisting-holos");
  });

  it("applies activeOnly filter when opts.activeOnly is true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByType("brand", { activeOnly: true });
    expect(mockQuery.where).toHaveBeenCalledWith("isActive", "==", true);
  });

  it("does NOT apply activeOnly filter by default", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByType("brand");
    // where on query should not have been called for isActive
    const queryWhereCalls = mockQuery.where.mock.calls as [string, string, unknown][];
    const isActiveCall = queryWhereCalls.find(([field]) => field === "isActive");
    expect(isActiveCall).toBeUndefined();
  });

  it("applies limit when opts.limit is set", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.listByType("bundle", { limit: 10 });
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
  });

  it("returns empty array when no documents match the type", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.listByType("bundle");
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findBySlugAndType
// ---------------------------------------------------------------------------
describe("CategoriesRepository.findBySlugAndType", () => {
  it("queries by slug field", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findBySlugAndType("action-figures");
    expect(mockCollection.where).toHaveBeenCalledWith("slug", "==", "action-figures");
  });

  it("limits to 1 result", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findBySlugAndType("action-figures");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });

  it("returns null when no document matches the slug", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.findBySlugAndType("nonexistent-slug");
    expect(result).toBeNull();
  });

  it("returns the category document when slug matches", async () => {
    const cat = makeCategoryDoc({ id: "category-action-figures", slug: "action-figures" });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: "category-action-figures", data: cat }]),
    );

    const result = await repo.findBySlugAndType("action-figures");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("action-figures");
  });

  it("adds categoryType filter when type argument is provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findBySlugAndType("some-brand", "brand");
    expect(mockQuery.where).toHaveBeenCalledWith("categoryType", "==", "brand");
  });

  it("does NOT add categoryType filter when type is not provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findBySlugAndType("action-figures");
    const queryWhereCalls = mockQuery.where.mock.calls as [string, string, unknown][];
    const typeFilterCall = queryWhereCalls.find(([field]) => field === "categoryType");
    expect(typeFilterCall).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getChildren
// ---------------------------------------------------------------------------
describe("CategoriesRepository.getChildren", () => {
  it("queries parentIds array-contains the given parentId", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getChildren("category-action-figures");
    expect(mockCollection.where).toHaveBeenCalledWith(
      "parentIds",
      "array-contains",
      "category-action-figures",
    );
  });

  it("limits to 100 documents", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getChildren("category-action-figures");
    expect(mockQuery.limit).toHaveBeenCalledWith(100);
  });

  it("filters in-memory to return only DIRECT children (parentIds last element === parentId)", async () => {
    // Direct child: parentIds last item = parentId
    const directChild = makeCategoryDoc({
      id: "cat-direct",
      parentIds: ["category-action-figures"],
    });
    // Non-direct descendant: parentIds last item is something else (it's a grandchild)
    const grandChild = makeCategoryDoc({
      id: "cat-grandchild",
      parentIds: ["category-action-figures", "cat-direct"],
    });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([
        { id: "cat-direct", data: directChild },
        { id: "cat-grandchild", data: grandChild },
      ]),
    );

    const results = await repo.getChildren("category-action-figures");
    expect(results.map((r) => r.id)).toContain("cat-direct");
    expect(results.map((r) => r.id)).not.toContain("cat-grandchild");
  });

  it("returns empty array when no children exist", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.getChildren("cat-leaf-node");
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateMetricsInBatch (synchronous batch staging)
// ---------------------------------------------------------------------------
describe("CategoriesRepository.updateMetricsInBatch", () => {
  it("stages a batch.update for the direct category", () => {
    const batch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    repo.updateMetricsInBatch(
      batch as never,
      "category-action-figures",
      [],
      1,
      0,
    );
    expect(batch.update).toHaveBeenCalledOnce();
  });

  it("stages batch.update for every ancestor in parentIds", () => {
    const batch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    repo.updateMetricsInBatch(
      batch as never,
      "cat-child",
      ["cat-root", "cat-parent"],
      1,
      0,
    );
    // 1 for direct + 2 for ancestors = 3 total
    expect(batch.update).toHaveBeenCalledTimes(3);
  });

  it("does NOT call batch.commit (caller is responsible)", () => {
    const batch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    repo.updateMetricsInBatch(
      batch as never,
      "cat-child",
      [],
      1,
      0,
    );
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("includes productId in arrayUnion for productIds field when productDelta > 0", () => {
    const capturedUpdates: Record<string, unknown>[] = [];
    const batch = {
      update: vi.fn((_ref, data) => capturedUpdates.push(data as Record<string, unknown>)),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    repo.updateMetricsInBatch(
      batch as never,
      "cat-child",
      [],
      1,
      0,
      "product-test-123",
    );
    const directUpdate = capturedUpdates[0];
    // arrayUnion mock returns args as array
    expect(directUpdate["metrics.productIds"]).toEqual(["product-test-123"]);
  });
});

// ---------------------------------------------------------------------------
// getCategoryBySlug
// ---------------------------------------------------------------------------
describe("CategoriesRepository.getCategoryBySlug", () => {
  it("queries slug == given slug and limits to 1", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getCategoryBySlug("action-figures");
    expect(mockCollection.where).toHaveBeenCalledWith("slug", "==", "action-figures");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });

  it("returns null when no category matches the slug", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.getCategoryBySlug("nonexistent");
    expect(result).toBeNull();
  });

  it("returns the category when slug matches", async () => {
    const cat = makeCategoryDoc({ id: "cat-af", slug: "action-figures" });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "cat-af", data: cat }]));
    const result = await repo.getCategoryBySlug("action-figures");
    expect(result?.slug).toBe("action-figures");
  });
});

// ---------------------------------------------------------------------------
// findActiveBrands
// ---------------------------------------------------------------------------
describe("CategoriesRepository.findActiveBrands", () => {
  it("queries categoryType == brand and isActive == true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findActiveBrands();
    expect(mockCollection.where).toHaveBeenCalledWith("categoryType", "==", "brand");
    expect(mockQuery.where).toHaveBeenCalledWith("isActive", "==", true);
  });

  it("orders by order asc", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findActiveBrands();
    expect(mockQuery.orderBy).toHaveBeenCalledWith("order", "asc");
  });

  it("returns active brand categories", async () => {
    const brand = makeCategoryDoc({
      id: "cat-bandai",
      categoryType: "brand",
      isActive: true,
    });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "cat-bandai", data: brand }]));
    const results = await repo.findActiveBrands();
    expect(results).toHaveLength(1);
    expect(results[0].categoryType).toBe("brand");
  });
});

// ---------------------------------------------------------------------------
// generateSublistingId
// ---------------------------------------------------------------------------
describe("CategoriesRepository.generateSublistingId", () => {
  it("returns sublisting- prefixed slug from name", () => {
    expect(repo.generateSublistingId("Holo Cards")).toBe("sublisting-holo-cards");
  });

  it("does not double-prefix if name already starts with sublisting-", () => {
    expect(repo.generateSublistingId("sublisting-holos")).toBe("sublisting-holos");
  });

  it("converts uppercase to lowercase", () => {
    expect(repo.generateSublistingId("POKEMON")).toBe("sublisting-pokemon");
  });

  it("replaces non-alphanumeric chars with hyphens", () => {
    expect(repo.generateSublistingId("First Edition!")).toBe(
      "sublisting-first-edition",
    );
  });

  it("trims leading and trailing hyphens", () => {
    expect(repo.generateSublistingId(" holos ")).toBe("sublisting-holos");
  });
});
