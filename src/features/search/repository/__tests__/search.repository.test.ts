import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchRepository } from "../search.repository";
import type { SearchQuery } from "../../types";

function makePagedResult(overrides = {}) {
  return {
    data: [],
    total: 0,
    page: 1,
    perPage: 24,
    totalPages: 0,
    ...overrides,
  };
}

const mockFindAll = vi.fn().mockResolvedValue(makePagedResult());

const repo = new SearchRepository({ findAll: mockFindAll } as never);

function captureFilters(): string {
  const call = mockFindAll.mock.calls[0][0] as { filters: string };
  return call.filters;
}

function captureSieveQuery() {
  return mockFindAll.mock.calls[0][0] as {
    filters: string;
    sort: string;
    order: string;
    page: number;
    perPage: number;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindAll.mockResolvedValue(makePagedResult());
});

// ---------------------------------------------------------------------------
// Mandatory status filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — mandatory status==published", () => {
  it("always appends status==published as the last filter", async () => {
    await repo.search({});
    const filters = captureFilters();
    expect(filters.split(",").at(-1)).toBe("status==published");
  });

  it("includes status==published even when no other filters given", async () => {
    await repo.search({});
    const filters = captureFilters();
    expect(filters).toBe("status==published");
  });

  it("includes status==published alongside other filters", async () => {
    await repo.search({ q: "charizard", category: "category-trading-cards" });
    const filters = captureFilters();
    expect(filters).toContain("status==published");
  });

  it("status==published appears exactly once regardless of query shape", async () => {
    await repo.search({ q: "test", category: "cat-1", minRating: 4 });
    const filters = captureFilters();
    const occurrences = filters.split(",").filter((p) => p === "status==published").length;
    expect(occurrences).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Text search filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — text query (q)", () => {
  it("sets title_=<q> when q is provided", async () => {
    await repo.search({ q: "charizard" });
    expect(captureFilters()).toContain("title_=charizard");
  });

  it("does NOT add a title filter when q is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("title_=");
  });

  it("does NOT add a title filter when q is empty string", async () => {
    await repo.search({ q: "" });
    expect(captureFilters()).not.toContain("title_=");
  });
});

// ---------------------------------------------------------------------------
// Category filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — category", () => {
  it("adds category==<slug> filter when category is provided", async () => {
    await repo.search({ category: "category-trading-cards" });
    expect(captureFilters()).toContain("category==category-trading-cards");
  });

  it("does NOT add category filter when category is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("category==");
  });
});

// ---------------------------------------------------------------------------
// Subcategory filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — subcategory", () => {
  it("adds subcategory==<slug> filter when subcategory is provided", async () => {
    await repo.search({ subcategory: "category-pokemon" });
    expect(captureFilters()).toContain("subcategory==category-pokemon");
  });

  it("does NOT add subcategory filter when subcategory is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("subcategory==");
  });
});

// ---------------------------------------------------------------------------
// Price range filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — price range", () => {
  it("adds price>=<min> filter when minPrice is provided", async () => {
    await repo.search({ minPrice: 500 });
    expect(captureFilters()).toContain("price>=500");
  });

  it("adds price<=<max> filter when maxPrice is provided", async () => {
    await repo.search({ maxPrice: 10000 });
    expect(captureFilters()).toContain("price<=10000");
  });

  it("adds both min and max when a price range is specified", async () => {
    await repo.search({ minPrice: 100, maxPrice: 5000 });
    const filters = captureFilters();
    expect(filters).toContain("price>=100");
    expect(filters).toContain("price<=5000");
  });

  it("does NOT add price filters when neither minPrice nor maxPrice provided", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("price");
  });

  it("adds price>=0 filter when minPrice is 0", async () => {
    await repo.search({ minPrice: 0 });
    expect(captureFilters()).toContain("price>=0");
  });
});

// ---------------------------------------------------------------------------
// Condition filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — condition", () => {
  it("adds condition==<value> filter when condition is provided", async () => {
    await repo.search({ condition: "mint" });
    expect(captureFilters()).toContain("condition==mint");
  });

  it("does NOT add condition filter when condition is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("condition==");
  });
});

// ---------------------------------------------------------------------------
// listingType filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — listingType", () => {
  it("adds listingType==auction filter for auction search", async () => {
    await repo.search({ listingType: "auction" });
    expect(captureFilters()).toContain("listingType==auction");
  });

  it("adds listingType==standard for standard search", async () => {
    await repo.search({ listingType: "standard" });
    expect(captureFilters()).toContain("listingType==standard");
  });

  it("adds listingType==pre-order for pre-order search", async () => {
    await repo.search({ listingType: "pre-order" });
    expect(captureFilters()).toContain("listingType==pre-order");
  });

  it("does NOT add listingType filter when listingType is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("listingType==");
  });
});

// ---------------------------------------------------------------------------
// In-stock filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — inStock", () => {
  it("adds availableQuantity>0 filter when inStock: true", async () => {
    await repo.search({ inStock: true });
    expect(captureFilters()).toContain("availableQuantity>0");
  });

  it("does NOT add availableQuantity filter when inStock: false", async () => {
    await repo.search({ inStock: false });
    expect(captureFilters()).not.toContain("availableQuantity");
  });

  it("does NOT add availableQuantity filter when inStock is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("availableQuantity");
  });
});

// ---------------------------------------------------------------------------
// Minimum rating filter
// ---------------------------------------------------------------------------
describe("SearchRepository.search — minRating", () => {
  it("adds averageRating>=<value> filter when minRating is provided", async () => {
    await repo.search({ minRating: 4 });
    expect(captureFilters()).toContain("averageRating>=4");
  });

  it("adds averageRating>=0 filter when minRating is 0", async () => {
    await repo.search({ minRating: 0 });
    expect(captureFilters()).toContain("averageRating>=0");
  });

  it("does NOT add averageRating filter when minRating is undefined", async () => {
    await repo.search({});
    expect(captureFilters()).not.toContain("averageRating");
  });
});

// ---------------------------------------------------------------------------
// All filters combined
// ---------------------------------------------------------------------------
describe("SearchRepository.search — combined filters", () => {
  it("builds combined filter string for full-featured query", async () => {
    const query: SearchQuery = {
      q: "pikachu",
      category: "category-trading-cards",
      subcategory: "category-pokemon",
      minPrice: 100,
      maxPrice: 5000,
      condition: "near-mint",
      listingType: "standard",
      inStock: true,
      minRating: 3,
    };
    await repo.search(query);
    const filters = captureFilters();
    expect(filters).toContain("title_=pikachu");
    expect(filters).toContain("category==category-trading-cards");
    expect(filters).toContain("subcategory==category-pokemon");
    expect(filters).toContain("price>=100");
    expect(filters).toContain("price<=5000");
    expect(filters).toContain("condition==near-mint");
    expect(filters).toContain("listingType==standard");
    expect(filters).toContain("availableQuantity>0");
    expect(filters).toContain("averageRating>=3");
    expect(filters).toContain("status==published");
    // status is always last
    expect(filters.split(",").at(-1)).toBe("status==published");
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
describe("SearchRepository.search — sort", () => {
  it("defaults to sort: createdAt, order: asc when no sort specified", async () => {
    await repo.search({});
    const q = captureSieveQuery();
    expect(q.sort).toBe("createdAt");
    expect(q.order).toBe("asc");
  });

  it("ascending sort: sort='price', no leading dash → order: asc", async () => {
    await repo.search({ sort: "price" });
    const q = captureSieveQuery();
    expect(q.sort).toBe("price");
    expect(q.order).toBe("asc");
  });

  it("descending sort: sort='-price' → order: desc, field: price", async () => {
    await repo.search({ sort: "-price" });
    const q = captureSieveQuery();
    expect(q.sort).toBe("price");
    expect(q.order).toBe("desc");
  });

  it("descending sort: sort='-createdAt' → order: desc, field: createdAt", async () => {
    await repo.search({ sort: "-createdAt" });
    const q = captureSieveQuery();
    expect(q.sort).toBe("createdAt");
    expect(q.order).toBe("desc");
  });

  it("ascending sort: sort='averageRating' → order: asc, field: averageRating", async () => {
    await repo.search({ sort: "averageRating" });
    const q = captureSieveQuery();
    expect(q.sort).toBe("averageRating");
    expect(q.order).toBe("asc");
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
describe("SearchRepository.search — pagination", () => {
  it("defaults to page: 1 when not provided", async () => {
    await repo.search({});
    const q = captureSieveQuery();
    expect(q.page).toBe(1);
  });

  it("defaults to perPage: 24 when pageSize not provided", async () => {
    await repo.search({});
    const q = captureSieveQuery();
    expect(q.perPage).toBe(24);
  });

  it("forwards custom page and pageSize", async () => {
    await repo.search({ page: 3, pageSize: 12 });
    const q = captureSieveQuery();
    expect(q.page).toBe(3);
    expect(q.perPage).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------
describe("SearchRepository.search — response shape", () => {
  it("maps PagedResult to SearchResponse correctly", async () => {
    mockFindAll.mockResolvedValue({
      data: [{ id: "p-1", title: "Charizard" }],
      total: 1,
      page: 1,
      perPage: 24,
      totalPages: 1,
    });
    const result = await repo.search({ q: "charizard" });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(24);
    expect(result.totalPages).toBe(1);
  });

  it("hasMore: true when page < totalPages", async () => {
    mockFindAll.mockResolvedValue({
      data: [],
      total: 100,
      page: 1,
      perPage: 24,
      totalPages: 5,
    });
    const result = await repo.search({});
    expect(result.hasMore).toBe(true);
  });

  it("hasMore: false when page == totalPages", async () => {
    mockFindAll.mockResolvedValue({
      data: [],
      total: 24,
      page: 1,
      perPage: 24,
      totalPages: 1,
    });
    const result = await repo.search({});
    expect(result.hasMore).toBe(false);
  });

  it("hasMore: false when page > totalPages (edge case)", async () => {
    mockFindAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      perPage: 24,
      totalPages: 1,
    });
    const result = await repo.search({});
    expect(result.hasMore).toBe(false);
  });

  it("q is empty string in response when no q provided", async () => {
    const result = await repo.search({});
    expect(result.q).toBe("");
  });

  it("q reflects the search term in response", async () => {
    const result = await repo.search({ q: "pokemon" });
    expect(result.q).toBe("pokemon");
  });

  it("returns empty items array when no results", async () => {
    mockFindAll.mockResolvedValue(makePagedResult());
    const result = await repo.search({ q: "nonexistent-product" });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Filter string format
// ---------------------------------------------------------------------------
describe("SearchRepository.search — filter string format", () => {
  it("joins multiple filters with commas", async () => {
    await repo.search({ q: "test", category: "cat-1" });
    const filters = captureFilters();
    const parts = filters.split(",");
    expect(parts.length).toBeGreaterThan(1);
    // No empty segments (no stray commas)
    expect(parts.every((p) => p.length > 0)).toBe(true);
  });

  it("single active filter + status produces exactly 2 comma-separated parts", async () => {
    await repo.search({ category: "cat-1" });
    const filters = captureFilters();
    const parts = filters.split(",");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe("category==cat-1");
    expect(parts[1]).toBe("status==published");
  });

  it("empty query produces filter string with only status==published", async () => {
    await repo.search({});
    expect(captureFilters()).toBe("status==published");
  });
});
