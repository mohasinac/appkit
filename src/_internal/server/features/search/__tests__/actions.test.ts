import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSearchProducts } = vi.hoisted(() => ({
  mockSearchProducts: vi.fn(),
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
}));

vi.mock("../../../../features/search/actions/search-actions", () => ({
  searchProducts: mockSearchProducts,
}));

import { searchAction } from "../actions";

function makeSearchResult(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ id: "product-hot-wheels-redline" }],
    q: "hot wheels",
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasMore: false,
    backend: "in-memory" as const,
    ...overrides,
  };
}

describe("searchAction — delegates to searchProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchProducts.mockResolvedValue(makeSearchResult());
  });

  it("calls searchProducts with the provided query", async () => {
    const query = { q: "hot wheels", page: 1, pageSize: 20 };
    await searchAction(query);
    expect(mockSearchProducts).toHaveBeenCalledWith(query);
  });

  it("returns { ok: true, data: searchProductsResult }", async () => {
    const result = makeSearchResult({ q: "pokemon", total: 5 });
    mockSearchProducts.mockResolvedValue(result);
    const action = await searchAction({ q: "pokemon" });
    expect(action.ok).toBe(true);
    expect((action as { data: unknown }).data).toEqual(result);
  });

  it("passes query.q through", async () => {
    await searchAction({ q: "beyblade" });
    expect(mockSearchProducts).toHaveBeenCalledWith(expect.objectContaining({ q: "beyblade" }));
  });

  it("passes query.page through", async () => {
    await searchAction({ q: "gundam", page: 3 });
    expect(mockSearchProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
  });

  it("passes query.pageSize through", async () => {
    await searchAction({ q: "funko", pageSize: 50 });
    expect(mockSearchProducts).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
  });

  it("passes query.category through", async () => {
    await searchAction({ category: "category-action-figures" });
    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ category: "category-action-figures" }),
    );
  });

  it("passes query.listingType through", async () => {
    await searchAction({ listingType: "auction" });
    expect(mockSearchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: "auction" }),
    );
  });
});

describe("searchAction — error fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchProducts rejects → returns fallback with ok:true and empty items", async () => {
    mockSearchProducts.mockRejectedValue(new Error("Firestore unavailable"));
    const result = await searchAction({ q: "charizard", pageSize: 10 });
    expect(result.ok).toBe(true);
    const data = (result as { data: Record<string, unknown> }).data;
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  });

  it("fallback q = query.q", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({ q: "pikachu" });
    const data = (result as { data: { q: string } }).data;
    expect(data.q).toBe("pikachu");
  });

  it("fallback q = '' when query.q is undefined", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({});
    const data = (result as { data: { q: string } }).data;
    expect(data.q).toBe("");
  });

  it("fallback pageSize = query.pageSize when provided", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({ pageSize: 50 });
    const data = (result as { data: { pageSize: number } }).data;
    expect(data.pageSize).toBe(50);
  });

  it("fallback pageSize = 20 when query.pageSize is undefined", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({});
    const data = (result as { data: { pageSize: number } }).data;
    expect(data.pageSize).toBe(20);
  });

  it("fallback page = 1", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({ q: "test" });
    const data = (result as { data: { page: number } }).data;
    expect(data.page).toBe(1);
  });

  it("fallback totalPages = 0", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({ q: "test" });
    const data = (result as { data: { totalPages: number } }).data;
    expect(data.totalPages).toBe(0);
  });

  it("fallback backend = 'in-memory'", async () => {
    mockSearchProducts.mockRejectedValue(new Error("error"));
    const result = await searchAction({ q: "test" });
    const data = (result as { data: { backend: string } }).data;
    expect(data.backend).toBe("in-memory");
  });
});
