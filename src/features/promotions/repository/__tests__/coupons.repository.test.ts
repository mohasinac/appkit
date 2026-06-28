import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

// Hoist schema mocks so vi.mock factories can reference them before module init
const {
  mockIsCouponValid,
  mockCanUserUseCoupon,
  mockCalculateDiscount,
  mockIsValidCouponCode,
} = vi.hoisted(() => ({
  mockIsCouponValid: vi.fn().mockReturnValue(true),
  mockCanUserUseCoupon: vi.fn().mockReturnValue(true),
  mockCalculateDiscount: vi.fn().mockReturnValue(100),
  mockIsValidCouponCode: vi.fn().mockReturnValue(true),
}));

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    getFirestoreCount: vi.fn().mockResolvedValue(0),
    prepareForFirestore: (d: unknown) => d,
  };
});

vi.mock("../../../../contracts/field-ops", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../contracts/field-ops")>();
  return {
    ...actual,
    increment: (n: number) => n,
    serverTimestamp: () => new Date(),
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
    deleteField: () => null,
  };
});

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

// Override schema validation functions so tests control branching without date arithmetic.
// Path is ../../schemas (2 levels up from __tests__) to reach promotions/schemas.
vi.mock("../../schemas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../schemas")>();
  return {
    ...actual,
    isCouponValid: mockIsCouponValid,
    canUserUseCoupon: mockCanUserUseCoupon,
    calculateDiscount: mockCalculateDiscount,
    isValidCouponCode: mockIsValidCouponCode,
  };
});

import { CouponsRepository } from "../coupons.repository";

const repo = new CouponsRepository();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id: "coupon-welcome10",
    code: "WELCOME10",
    name: "Welcome 10",
    type: "percentage" as const,
    scope: "admin" as const,
    discount: { value: 10, maxDiscount: 500, minPurchase: 200 },
    usage: { totalLimit: 100, perUserLimit: 1, currentUsage: 0 },
    validity: {
      isActive: true,
      startDate: new Date(Date.now() - 86_400_000),
      endDate: new Date(Date.now() + 86_400_000 * 30),
    },
    restrictions: {
      combineWithSellerCoupons: true,
      applicableProducts: [] as string[],
      excludeProducts: [] as string[],
    },
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const CART_ITEMS = [
  {
    productId: "product-a",
    storeId: "store-A",
    price: 1000,
    quantity: 1,
    listingType: "standard" as const,
  },
  {
    productId: "product-b",
    storeId: "store-B",
    price: 500,
    quantity: 2,
    listingType: "auction" as const,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish chainability every test (clearAllMocks removes call history only, but be explicit)
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockDocRef.collection.mockReturnValue(mockCollection);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockBatch.commit.mockResolvedValue(undefined);
  // Schema function defaults — all pass by default
  mockIsCouponValid.mockReturnValue(true);
  mockCanUserUseCoupon.mockReturnValue(true);
  mockCalculateDiscount.mockReturnValue(100);
  mockIsValidCouponCode.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// getCouponByCode
// ---------------------------------------------------------------------------

describe("CouponsRepository.getCouponByCode", () => {
  it("returns null when code does not exist (empty snapshot)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.getCouponByCode("NOTEXIST");
    expect(result).toBeNull();
  });

  it("returns coupon document when code is found", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    const result = await repo.getCouponByCode("WELCOME10");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("WELCOME10");
  });

  it("normalizes lowercase input code to uppercase before querying", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getCouponByCode("welcome10");
    // COUPON_FIELDS.CODE maps to "code"; the value must be uppercased
    expect(mockQuery.where).toHaveBeenCalledWith("code", "==", "WELCOME10");
  });

  it("uses limit(1) to avoid scanning the full collection", async () => {
    await repo.getCouponByCode("ANYCODE");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// validateCoupon
// ---------------------------------------------------------------------------

describe("CouponsRepository.validateCoupon", () => {
  it("invalid code format (isValidCouponCode=false) → { valid: false }", async () => {
    mockIsValidCouponCode.mockReturnValue(false);
    const result = await repo.validateCoupon("!BAD!", "user-1", 1000);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid/i);
  });

  it("code not found in Firestore → { valid: false, message contains 'not found' }", async () => {
    mockIsValidCouponCode.mockReturnValue(true);
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.validateCoupon("FAKE99", "user-1", 1000);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it("isCouponValid=false (expired/inactive) → { valid: false, message contains 'not currently valid' }", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockIsCouponValid.mockReturnValue(false);
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.validateCoupon("WELCOME10", "user-1", 1000);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/not currently valid/i);
  });

  it("perUserLimit reached (canUserUseCoupon=false) → { valid: false, message contains 'usage limit' }", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap({ usageCount: 1 }));
    mockCanUserUseCoupon.mockReturnValue(false);
    const result = await repo.validateCoupon("WELCOME10", "user-1", 1000);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/usage limit/i);
  });

  it("orderTotal < minPurchase → { valid: false, message contains 'Minimum purchase' }", async () => {
    const coupon = makeCoupon({ discount: { value: 10, minPurchase: 5000 } });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.validateCoupon("WELCOME10", "user-1", 400); // 400 < 5000
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/minimum purchase/i);
  });

  it("orderTotal === minPurchase → passes the check", async () => {
    const coupon = makeCoupon({ discount: { value: 10, minPurchase: 1000 } });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.validateCoupon("WELCOME10", "user-1", 1000);
    expect(result.valid).toBe(true);
  });

  it("valid coupon → { valid: true, discountAmount from calculateDiscount }", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    mockCalculateDiscount.mockReturnValue(150);
    const result = await repo.validateCoupon("WELCOME10", "user-1", 1500);
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(150);
  });

  it("valid coupon → includes coupon document in response", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.validateCoupon("WELCOME10", "user-1", 1000);
    expect(result.valid).toBe(true);
    expect(result.coupon).toBeDefined();
  });

  it("coupon with no minPurchase → no minimum purchase check performed", async () => {
    const coupon = makeCoupon({ discount: { value: 10 } }); // no minPurchase
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.validateCoupon("WELCOME10", "user-1", 1); // tiny order
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateCouponForCart
// ---------------------------------------------------------------------------

describe("CouponsRepository.validateCouponForCart", () => {
  function setupCoupon(overrides: Record<string, unknown> = {}) {
    const coupon = makeCoupon(overrides);
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockDocRef.get.mockResolvedValue(makeSnap(null)); // no user usage
    return coupon;
  }

  it("seller coupon + no items from that store → { valid: false }", async () => {
    setupCoupon({
      scope: "seller",
      storeId: "store-X", // no cart items from store-X
      restrictions: { applicableProducts: [], excludeProducts: [] },
    });
    const result = await repo.validateCouponForCart("STORESEL", "user-1", CART_ITEMS);
    expect(result.valid).toBe(false);
  });

  it("seller coupon + items from that store → eligibleProductIds contains only store items", async () => {
    setupCoupon({
      scope: "seller",
      storeId: "store-A",
      restrictions: { applicableProducts: [], excludeProducts: [] },
    });
    const result = await repo.validateCouponForCart("STORESEL", "user-1", CART_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.eligibleProductIds).toEqual(["product-a"]);
  });

  it("applicableToAuctions=true → filters to auction items only", async () => {
    setupCoupon({
      applicableToAuctions: true,
      restrictions: { applicableProducts: [], excludeProducts: [] },
    });
    const result = await repo.validateCouponForCart("AUC10", "user-1", CART_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.eligibleProductIds).toEqual(["product-b"]);
  });

  it("applicableToAuctions=false → filters out auction items", async () => {
    setupCoupon({
      applicableToAuctions: false,
      restrictions: { applicableProducts: [], excludeProducts: [] },
    });
    const result = await repo.validateCouponForCart("NOAUC", "user-1", CART_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.eligibleProductIds).toEqual(["product-a"]);
  });

  it("applicableProducts restriction → only those products are eligible", async () => {
    setupCoupon({
      restrictions: { applicableProducts: ["product-a"], excludeProducts: [] },
    });
    const result = await repo.validateCouponForCart("RESTR", "user-1", CART_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.eligibleProductIds).toEqual(["product-a"]);
  });

  it("excludeProducts restriction → listed products removed from eligibility", async () => {
    setupCoupon({
      restrictions: { applicableProducts: [], excludeProducts: ["product-a"] },
    });
    const result = await repo.validateCouponForCart("EX10", "user-1", CART_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.eligibleProductIds).not.toContain("product-a");
    expect(result.eligibleProductIds).toContain("product-b");
  });

  it("all products excluded → { valid: false }", async () => {
    setupCoupon({
      restrictions: {
        applicableProducts: [],
        excludeProducts: ["product-a", "product-b"],
      },
    });
    const result = await repo.validateCouponForCart("EX10", "user-1", CART_ITEMS);
    expect(result.valid).toBe(false);
  });

  it("eligibleSubtotal < minPurchase → { valid: false, message: Minimum purchase }", async () => {
    setupCoupon({
      discount: { value: 10, minPurchase: 50_000 }, // 50,000 paise >> eligible subtotal
      restrictions: { applicableProducts: ["product-a"], excludeProducts: [] },
    });
    const result = await repo.validateCouponForCart("MINP", "user-1", CART_ITEMS);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/minimum purchase/i);
  });

  it("calculateDiscount called with eligibleSubtotal not full cart total", async () => {
    // product-a only eligible (price=1000, qty=1) — product-b excluded
    setupCoupon({
      restrictions: { applicableProducts: ["product-a"], excludeProducts: [] },
    });
    await repo.validateCouponForCart("SEL", "user-1", CART_ITEMS);
    // eligibleSubtotal = 1000 (product-a price * qty)
    expect(mockCalculateDiscount).toHaveBeenCalledWith(expect.anything(), 1000);
  });

  it("returns eligibleSubtotal and eligibleProductIds on success", async () => {
    setupCoupon({
      restrictions: { applicableProducts: [], excludeProducts: [] },
    });
    mockCalculateDiscount.mockReturnValue(200);
    const result = await repo.validateCouponForCart("ALL", "user-1", CART_ITEMS);
    expect(result.valid).toBe(true);
    expect(result.eligibleSubtotal).toBeDefined();
    expect(Array.isArray(result.eligibleProductIds)).toBe(true);
    expect(result.eligibleProductIds?.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// applyCoupon
// ---------------------------------------------------------------------------

describe("CouponsRepository.applyCoupon", () => {
  it("batch.update increments usage.currentUsage on coupon doc", async () => {
    await repo.applyCoupon("coupon-1", "WELCOME10", "user-1", ["order-1"], 100);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "usage.currentUsage": 1 }),
    );
  });

  it("batch.update increments stats.totalUses on coupon doc", async () => {
    await repo.applyCoupon("coupon-1", "WELCOME10", "user-1", ["order-1"], 100);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "stats.totalUses": 1 }),
    );
  });

  it("batch.update increments stats.totalDiscount by the discountAmount", async () => {
    await repo.applyCoupon("coupon-1", "WELCOME10", "user-1", ["order-1"], 250);
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ "stats.totalDiscount": 250 }),
    );
  });

  it("batch.set on couponUsage subcollection with merge: true", async () => {
    await repo.applyCoupon("coupon-1", "WELCOME10", "user-1", ["order-1"], 100);
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        usageCount: 1,
        userId: "user-1",
        couponCode: "WELCOME10",
      }),
      { merge: true },
    );
  });

  it("batch.commit() called exactly once", async () => {
    await repo.applyCoupon("coupon-1", "WELCOME10", "user-1", ["order-1"], 100);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("multiple orderIds are all passed to arrayUnion spread", async () => {
    await repo.applyCoupon("coupon-1", "WELCOME10", "user-1", ["order-1", "order-2", "order-3"], 150);
    const setCall = mockBatch.set.mock.calls[0] as [unknown, Record<string, unknown>, unknown];
    const data = setCall[1];
    // arrayUnion mock returns args as array; verify all orderIds are in there
    const orders = data.orders as unknown[];
    expect(orders).toContain("order-1");
    expect(orders).toContain("order-2");
    expect(orders).toContain("order-3");
  });

  it("couponCode stored in uppercase on the usage doc", async () => {
    await repo.applyCoupon("coupon-1", "welcome10", "user-1", ["order-1"], 100);
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ couponCode: "WELCOME10" }),
      { merge: true },
    );
  });
});

// ---------------------------------------------------------------------------
// getUserCouponUsageCount
// ---------------------------------------------------------------------------

describe("CouponsRepository.getUserCouponUsageCount", () => {
  it("no usage doc → returns 0", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null)); // exists=false
    const count = await repo.getUserCouponUsageCount("user-1", "coupon-1");
    expect(count).toBe(0);
  });

  it("existing doc with usageCount=3 → returns 3", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({ usageCount: 3 }));
    const count = await repo.getUserCouponUsageCount("user-1", "coupon-1");
    expect(count).toBe(3);
  });

  it("existing doc with no usageCount field → defaults to 1 (legacy record)", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({})); // exists=true, usageCount absent
    const count = await repo.getUserCouponUsageCount("user-1", "coupon-1");
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getActiveCoupons
// ---------------------------------------------------------------------------

describe("CouponsRepository.getActiveCoupons", () => {
  it("queries where validity.isActive == true", async () => {
    await repo.getActiveCoupons();
    expect(mockQuery.where).toHaveBeenCalledWith("validity.isActive", "==", true);
  });

  it("coupon returned by Firestore but isCouponValid=false → filtered out in-memory", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockIsCouponValid.mockReturnValue(false);
    const result = await repo.getActiveCoupons();
    expect(result).toHaveLength(0);
  });

  it("coupon where isCouponValid=true → included in result", async () => {
    const coupon = makeCoupon();
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: coupon.id, data: coupon }]));
    mockIsCouponValid.mockReturnValue(true);
    const result = await repo.getActiveCoupons();
    expect(result).toHaveLength(1);
  });

  it("empty snapshot → returns []", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.getActiveCoupons();
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getStoreCoupons
// ---------------------------------------------------------------------------

describe("CouponsRepository.getStoreCoupons", () => {
  it("queries where storeId matches provided store", async () => {
    await repo.getStoreCoupons("store-X");
    expect(mockQuery.where).toHaveBeenCalledWith("storeId", "==", "store-X");
  });

  it("returns empty array when no coupons exist for store", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.getStoreCoupons("store-unknown");
    expect(result).toHaveLength(0);
  });

  it("returns all coupons for the store", async () => {
    const c1 = makeCoupon({ id: "coupon-1", code: "STORE10" });
    const c2 = makeCoupon({ id: "coupon-2", code: "STORE20" });
    mockQuery.get.mockResolvedValue(makeQuerySnap([
      { id: "coupon-1", data: c1 },
      { id: "coupon-2", data: c2 },
    ]));
    const result = await repo.getStoreCoupons("store-A");
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getExpiredActiveRefs
// ---------------------------------------------------------------------------

describe("CouponsRepository.getExpiredActiveRefs", () => {
  it("queries where validity.isActive==true and validity.endDate<=now", async () => {
    const now = new Date();
    await repo.getExpiredActiveRefs(now);
    expect(mockQuery.where).toHaveBeenCalledWith("validity.isActive", "==", true);
    expect(mockQuery.where).toHaveBeenCalledWith("validity.endDate", "<=", now);
  });

  it("returns doc refs for expired active coupons", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([
      { id: "coupon-expired-1", data: {} },
      { id: "coupon-expired-2", data: {} },
    ]));
    const refs = await repo.getExpiredActiveRefs(new Date());
    expect(refs).toHaveLength(2);
  });

  it("empty snapshot → returns empty array", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const refs = await repo.getExpiredActiveRefs(new Date());
    expect(refs).toHaveLength(0);
  });

  it("limits query to 500 results", async () => {
    await repo.getExpiredActiveRefs(new Date());
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// deactivateInBatch
// ---------------------------------------------------------------------------

describe("CouponsRepository.deactivateInBatch", () => {
  it("stages update { validity.isActive: false } on the ref in caller's batch", () => {
    const ref = { id: "coupon-old" } as unknown as import("firebase-admin/firestore").DocumentReference;
    const batch = mockBatch as unknown as import("firebase-admin/firestore").WriteBatch;
    repo.deactivateInBatch(batch, ref);
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ "validity.isActive": false }),
    );
  });

  it("does NOT call batch.commit() — caller owns the commit", () => {
    const ref = { id: "coupon-old" } as unknown as import("firebase-admin/firestore").DocumentReference;
    const batch = mockBatch as unknown as import("firebase-admin/firestore").WriteBatch;
    repo.deactivateInBatch(batch, ref);
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});
