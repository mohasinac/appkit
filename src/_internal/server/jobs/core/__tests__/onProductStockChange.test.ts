import { describe, it, expect, vi, beforeEach } from "vitest";

// onProductStockChange uses ctx.db directly, no repository imports needed.

vi.mock("../../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import {
  handleProductStockChange,
  isAvailable,
  syncBundlesForProduct,
} from "../onProductStockChange";
import { PRODUCT_FIELDS } from "../../../../../constants/field-names";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(dbQuery?: ReturnType<typeof vi.fn>) {
  const mockQuery = dbQuery ?? vi.fn().mockReturnThis();
  const queryChain = { where: vi.fn().mockReturnThis(), get: vi.fn() };
  return {
    db: {
      collection: vi.fn().mockReturnValue(queryChain),
    },
    queryChain,
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

const PUBLISHED = PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED;

// ── isAvailable (pure function) ───────────────────────────────────────────────

describe("isAvailable — pure function", () => {
  it("null doc → false", () => {
    expect(isAvailable(null)).toBe(false);
  });

  it("isSold=true → false", () => {
    expect(isAvailable({ isSold: true, availableQuantity: 1, status: PUBLISHED })).toBe(false);
  });

  it("availableQuantity=0 → false", () => {
    expect(isAvailable({ isSold: false, availableQuantity: 0, status: PUBLISHED })).toBe(false);
  });

  it("status != published → false", () => {
    expect(isAvailable({ isSold: false, availableQuantity: 5, status: "draft" })).toBe(false);
  });

  it("status=published, qty>0, not sold → true", () => {
    expect(isAvailable({ isSold: false, availableQuantity: 1, status: PUBLISHED })).toBe(true);
  });

  it("qty undefined (no quantity field) → true (quantity not tracked = always available)", () => {
    // Intentional design: the check is `typeof qty === "number" && qty <= 0`.
    // If qty is undefined, the guard is skipped → published product is available.
    expect(isAvailable({ isSold: false, availableQuantity: undefined, status: PUBLISHED })).toBe(true);
  });
});

// ── handleProductStockChange ──────────────────────────────────────────────────

const INPUT_BASE = {
  productId: "product-charizard",
  isDelete: false,
};

function makeAvailableSnap() {
  return { isSold: false, availableQuantity: 1, status: PUBLISHED };
}

function makeUnavailableSnap() {
  return { isSold: false, availableQuantity: 0, status: PUBLISHED };
}

describe("handleProductStockChange — early exit: no state flip", () => {
  it("skips when available → available (no flip)", async () => {
    const ctx = makeCtx();
    await handleProductStockChange({
      ...INPUT_BASE,
      before: makeAvailableSnap(),
      after: makeAvailableSnap(),
    }, ctx);
    expect(ctx.db.collection).not.toHaveBeenCalled();
  });

  it("skips when unavailable → unavailable (no flip)", async () => {
    const ctx = makeCtx();
    await handleProductStockChange({
      ...INPUT_BASE,
      before: makeUnavailableSnap(),
      after: makeUnavailableSnap(),
    }, ctx);
    expect(ctx.db.collection).not.toHaveBeenCalled();
  });

  it("processes when isDelete=true even if state appears unchanged", async () => {
    const ctx = makeCtx();
    ctx.db.collection = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
    });
    await handleProductStockChange({
      ...INPUT_BASE,
      isDelete: true,
      before: makeAvailableSnap(),
      after: makeAvailableSnap(),
    }, ctx);
    expect(ctx.db.collection).toHaveBeenCalled();
  });
});

describe("handleProductStockChange — state flip triggers sync", () => {
  it("available → unavailable triggers sync", async () => {
    const ctx = makeCtx();
    ctx.db.collection = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
    });
    await handleProductStockChange({
      ...INPUT_BASE,
      before: makeAvailableSnap(),
      after: makeUnavailableSnap(),
    }, ctx);
    expect(ctx.db.collection).toHaveBeenCalled();
  });

  it("unavailable → available triggers sync", async () => {
    const ctx = makeCtx();
    ctx.db.collection = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
    });
    await handleProductStockChange({
      ...INPUT_BASE,
      before: makeUnavailableSnap(),
      after: makeAvailableSnap(),
    }, ctx);
    expect(ctx.db.collection).toHaveBeenCalled();
  });

  it("logs synced bundles and groups count", async () => {
    const ctx = makeCtx();
    ctx.db.collection = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
    });
    await handleProductStockChange({
      ...INPUT_BASE,
      before: makeAvailableSnap(),
      after: makeUnavailableSnap(),
    }, ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      "onProductStockChange synced",
      expect.objectContaining({ productId: "product-charizard" }),
    );
  });

  it("sync failure is non-fatal — logs error but does not throw", async () => {
    const ctx = makeCtx();
    ctx.db.collection = vi.fn().mockImplementation(() => {
      throw new Error("Firestore unavailable");
    });
    await expect(handleProductStockChange({
      ...INPUT_BASE,
      before: makeAvailableSnap(),
      after: makeUnavailableSnap(),
    }, ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});

describe("syncBundlesForProduct — bundle recompute", () => {
  it("does nothing when no bundles reference the product", async () => {
    const ctx = makeCtx();
    const mockQuery = { where: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) };
    ctx.db.collection = vi.fn().mockReturnValue(mockQuery);
    const updated = await syncBundlesForProduct("product-x", ctx);
    expect(updated).toBe(0);
  });

  it("updates bundle when stockStatus changes", async () => {
    // Bundle has 1 product: "product-x" (now unavailable)
    const bundleRef = { update: vi.fn().mockResolvedValue(undefined) };
    const bundleDoc = {
      ref: bundleRef,
      data: () => ({
        bundleProductIds: ["product-x"],
        bundleStockStatus: "in_stock", // currently in_stock...
      }),
    };
    const memberSnap = {
      docs: [{ data: () => ({ isSold: false, availableQuantity: 0, status: PUBLISHED }) }],
      size: 1,
    };

    const ctx = makeCtx();
    let callIdx = 0;
    ctx.db.collection = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockImplementation(async () => {
        callIdx++;
        // First call = bundles query; subsequent calls = member product queries
        if (callIdx === 1) return { docs: [bundleDoc], size: 1 };
        return memberSnap;
      }),
    });

    const updated = await syncBundlesForProduct("product-x", ctx);
    expect(updated).toBe(1);
    expect(bundleRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ bundleStockStatus: "out_of_stock" }),
    );
  });

  it("does NOT update bundle when stockStatus has not changed", async () => {
    const bundleRef = { update: vi.fn().mockResolvedValue(undefined) };
    const bundleDoc = {
      ref: bundleRef,
      data: () => ({
        bundleProductIds: ["product-x"],
        bundleStockStatus: "in_stock", // already in_stock
      }),
    };
    // Member is available → status stays in_stock → no update needed
    const memberSnap = {
      docs: [{ data: () => ({ isSold: false, availableQuantity: 5, status: PUBLISHED }) }],
      size: 1,
    };

    const ctx = makeCtx();
    let callIdx = 0;
    ctx.db.collection = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockImplementation(async () => {
        callIdx++;
        if (callIdx === 1) return { docs: [bundleDoc], size: 1 };
        return memberSnap;
      }),
    });

    const updated = await syncBundlesForProduct("product-x", ctx);
    expect(updated).toBe(0);
    expect(bundleRef.update).not.toHaveBeenCalled();
  });
});
