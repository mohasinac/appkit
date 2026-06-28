import { describe, it, expect, vi, beforeEach } from "vitest";

function makeCollectionChain(snapOverrides: { empty?: boolean; docs?: unknown[] } = {}) {
  const snap = {
    empty: snapOverrides.empty ?? (snapOverrides.docs?.length === 0),
    size: snapOverrides.docs?.length ?? 0,
    docs: snapOverrides.docs ?? [],
  };
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(snap),
  };
  return { chain, snap };
}

function makeProductSnap(docs: { id: string; data: object }[] = []) {
  return {
    size: docs.length,
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  };
}

import { runBundleStockSync } from "../bundleStockSync";
import type { JobContext } from "../../runtime/types";

function makeCtx(bundleDocs: unknown[] = []): JobContext {
  const bundleSnap = {
    empty: bundleDocs.length === 0,
    size: bundleDocs.length,
    docs: bundleDocs,
  };
  const productQueryChain = {
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(makeProductSnap([])),
  };
  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "categories") {
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(bundleSnap),
        };
      }
      return productQueryChain;
    }),
    batch: vi.fn().mockReturnValue({ commit: vi.fn().mockResolvedValue(undefined) }),
  };
  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

describe("runBundleStockSync — no active bundles", () => {
  it("returns early without querying products when snap is empty", async () => {
    const ctx = makeCtx([]);
    await runBundleStockSync(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no active bundle/i));
  });
});

describe("runBundleStockSync — bundle with no productIds", () => {
  it("skips bundles with empty bundleProductIds (continue)", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const bundleDocs = [
      {
        id: "category-bundle-empty",
        data: () => ({ bundleProductIds: [], bundleStockStatus: "in_stock" }),
        ref: { update: mockUpdate },
      },
    ];
    const ctx = makeCtx(bundleDocs);
    await runBundleStockSync(ctx);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("runBundleStockSync — status computation", () => {
  it("sets out_of_stock when a member product has availableQuantity = 0", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const bundleRef = { update: mockUpdate };
    const bundleDocs = [
      {
        id: "category-bundle-1",
        data: () => ({
          bundleProductIds: ["product-a"],
          bundleStockStatus: "in_stock",
        }),
        ref: bundleRef,
      },
    ];
    const productSnap = makeProductSnap([
      { id: "product-a", data: { status: "published", availableQuantity: 0 } },
    ]);
    const db = {
      collection: vi.fn().mockImplementation((col: string) => {
        if (col === "categories") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              empty: false,
              size: 1,
              docs: bundleDocs,
            }),
          };
        }
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }),
    };
    const ctx = {
      db: db as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runBundleStockSync(ctx);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ bundleStockStatus: "out_of_stock" }),
    );
  });

  it("sets in_stock when all member products are published and available", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const bundleDocs = [
      {
        id: "category-bundle-2",
        data: () => ({
          bundleProductIds: ["product-b"],
          bundleStockStatus: "out_of_stock",
        }),
        ref: { update: mockUpdate },
      },
    ];
    const productSnap = makeProductSnap([
      { id: "product-b", data: { status: "published", availableQuantity: 5, isSold: false } },
    ]);
    const db = {
      collection: vi.fn().mockImplementation((col: string) => {
        if (col === "categories") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ empty: false, size: 1, docs: bundleDocs }),
          };
        }
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }),
    };
    const ctx = {
      db: db as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runBundleStockSync(ctx);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ bundleStockStatus: "in_stock" }),
    );
  });

  it("does NOT call ref.update when status hasn't changed", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const bundleDocs = [
      {
        id: "category-bundle-same",
        data: () => ({
          bundleProductIds: ["product-c"],
          bundleStockStatus: "out_of_stock",
        }),
        ref: { update: mockUpdate },
      },
    ];
    // member has 0 qty → out_of_stock (same as current)
    const productSnap = makeProductSnap([
      { id: "product-c", data: { status: "published", availableQuantity: 0 } },
    ]);
    const db = {
      collection: vi.fn().mockImplementation((col: string) => {
        if (col === "categories") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ empty: false, size: 1, docs: bundleDocs }),
          };
        }
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }),
    };
    const ctx = {
      db: db as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runBundleStockSync(ctx);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("sets out_of_stock when member product is missing from Firestore (fewer docs than ids)", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const bundleDocs = [
      {
        id: "category-bundle-missing",
        data: () => ({
          bundleProductIds: ["product-x", "product-y"],
          bundleStockStatus: "in_stock",
        }),
        ref: { update: mockUpdate },
      },
    ];
    // only 1 doc returned for 2 ids → chunk.length mismatch
    const productSnap = makeProductSnap([
      { id: "product-x", data: { status: "published", availableQuantity: 10 } },
    ]);
    const db = {
      collection: vi.fn().mockImplementation((col: string) => {
        if (col === "categories") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ empty: false, size: 1, docs: bundleDocs }),
          };
        }
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }),
    };
    const ctx = {
      db: db as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runBundleStockSync(ctx);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ bundleStockStatus: "out_of_stock" }),
    );
  });
});

describe("runBundleStockSync — isSold=true means out_of_stock", () => {
  it("considers isSold products as unavailable", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const bundleDocs = [
      {
        id: "category-bundle-sold",
        data: () => ({ bundleProductIds: ["product-sold"], bundleStockStatus: "in_stock" }),
        ref: { update: mockUpdate },
      },
    ];
    const productSnap = makeProductSnap([
      { id: "product-sold", data: { status: "published", isSold: true, availableQuantity: 10 } },
    ]);
    const db = {
      collection: vi.fn().mockImplementation((col: string) => {
        if (col === "categories") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ empty: false, size: 1, docs: bundleDocs }),
          };
        }
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }),
    };
    const ctx = {
      db: db as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runBundleStockSync(ctx);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ bundleStockStatus: "out_of_stock" }),
    );
  });
});

describe("runBundleStockSync — logs completion", () => {
  it("logs scanned and updated counts at completion", async () => {
    const bundleDocs = [
      {
        id: "category-bundle-log",
        data: () => ({ bundleProductIds: [], bundleStockStatus: "out_of_stock" }),
        ref: { update: vi.fn() },
      },
    ];
    const ctx = makeCtx(bundleDocs);
    await runBundleStockSync(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.objectContaining({ scanned: expect.any(Number), updated: expect.any(Number) }),
    );
  });
});
