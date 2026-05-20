import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all repository imports before importing the module under test.
vi.mock("../../../../../repositories", () => ({
  productRepository: { list: vi.fn() },
  blogRepository: { listAll: vi.fn() },
  eventRepository: { list: vi.fn() },
  couponsRepository: { list: vi.fn() },
  storeRepository: { listStores: vi.fn() },
  categoriesRepository: { list: vi.fn() },
  bidRepository: { list: vi.fn() },
  payoutRepository: { list: vi.fn() },
  orderRepository: { listAll: vi.fn() },
  reviewRepository: { listAll: vi.fn() },
  faqsRepository: { list: vi.fn() },
  notificationRepository: { list: vi.fn() },
  scammerRepository: { listAll: vi.fn() },
  productFeaturesRepository: { list: vi.fn() },
  homepageSectionsRepository: { list: vi.fn() },
  userRepository: { list: vi.fn() },
  eventEntryRepository: { listForEvent: vi.fn() },
  productTemplateRepository: { listByStore: vi.fn() },
}));

import { runListingProcessor } from "../listingProcessor";
import {
  productRepository,
  blogRepository,
  eventRepository,
  couponsRepository,
  storeRepository,
} from "../../../../../repositories";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    job: "test",
    db: {} as JobContext["db"],
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn(),
    now: new Date(),
  };
}

const EMPTY_RESULT = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  (productRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue(EMPTY_RESULT);
  (blogRepository.listAll as ReturnType<typeof vi.fn>).mockResolvedValue(EMPTY_RESULT);
  (eventRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue(EMPTY_RESULT);
  (couponsRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue(EMPTY_RESULT);
  (storeRepository.listStores as ReturnType<typeof vi.fn>).mockResolvedValue(EMPTY_RESULT);
});

describe("runListingProcessor", () => {
  it("throws 400 when body is missing collection", async () => {
    const ctx = makeCtx();
    await expect(
      runListingProcessor({} as Parameters<typeof runListingProcessor>[0], ctx),
    ).rejects.toMatchObject({ httpStatus: 400, message: "Missing collection" });
  });

  it("throws 400 for an unsupported collection name", async () => {
    const ctx = makeCtx();
    await expect(
      runListingProcessor({ collection: "nonexistent" }, ctx),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it("calls the correct lister for 'products'", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", f: "status==published" }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ filters: "status==published" }),
      {},
    );
  });

  it("calls blogRepository for 'blogPosts'", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "blogPosts" }, ctx);
    expect(blogRepository.listAll).toHaveBeenCalled();
  });

  it("calls eventRepository for 'events'", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "events" }, ctx);
    expect(eventRepository.list).toHaveBeenCalled();
  });

  it("passes filters and sorts to the lister", async () => {
    const ctx = makeCtx();
    await runListingProcessor({
      collection: "products",
      f: "brand==hasbro",
      s: "-price",
    }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ filters: "brand==hasbro", sorts: "-price" }),
      {},
    );
  });

  it("uses default sort when s is absent", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products" }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ sorts: "-createdAt" }),
      {},
    );
  });

  it("clamps pageSize to MAX_PAGE_SIZE (100)", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", ps: 999 }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: "100" }),
      {},
    );
  });

  it("uses DEFAULT_PAGE_SIZE when ps is 0", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", ps: 0 }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: "20" }),
      {},
    );
  });

  it("uses DEFAULT_PAGE_SIZE when ps is negative", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", ps: -5 }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: "20" }),
      {},
    );
  });

  it("reads page from p param", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", p: 3 }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: "3" }),
      {},
    );
  });

  it("decodes a valid cursor and uses its page over p", async () => {
    // Encode page=5 as a cursor
    const cursor = Buffer.from(JSON.stringify({ page: 5 }), "utf8").toString("base64");
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", cursor, p: 1 }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: "5" }),
      {},
    );
  });

  it("falls back to p when cursor is invalid base64 JSON", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "products", cursor: "!!!notbase64!!!", p: 2 }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: "2" }),
      {},
    );
  });

  it("encodes the next cursor when hasMore is true", async () => {
    (productRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EMPTY_RESULT,
      hasMore: true,
      page: 1,
    });
    const ctx = makeCtx();
    const result = await runListingProcessor({ collection: "products", p: 1 }, ctx);
    expect(result.cursor).not.toBeNull();
    // Decode and verify it points to page 2
    const decoded = JSON.parse(Buffer.from(result.cursor!, "base64").toString("utf8"));
    expect(decoded.page).toBe(2);
  });

  it("returns null cursor when hasMore is false", async () => {
    const ctx = makeCtx();
    const result = await runListingProcessor({ collection: "products" }, ctx);
    expect(result.cursor).toBeNull();
  });

  it("passes baseOpts to the lister", async () => {
    const ctx = makeCtx();
    await runListingProcessor({
      collection: "products",
      baseOpts: { storeId: "store-abc" },
    }, ctx);
    expect(productRepository.list).toHaveBeenCalledWith(
      expect.any(Object),
      { storeId: "store-abc" },
    );
  });

  it("calls stores lister with activeOnly=true by default", async () => {
    const ctx = makeCtx();
    await runListingProcessor({ collection: "stores" }, ctx);
    expect(storeRepository.listStores).toHaveBeenCalledWith(
      expect.any(Object),
      true,
    );
  });

  it("returns the items from the lister result", async () => {
    const items = [{ id: "p1" }, { id: "p2" }];
    (productRepository.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EMPTY_RESULT,
      items,
      total: 2,
    });
    const ctx = makeCtx();
    const result = await runListingProcessor({ collection: "products" }, ctx);
    expect(result.items).toEqual(items);
    expect(result.total).toBe(2);
  });
});
