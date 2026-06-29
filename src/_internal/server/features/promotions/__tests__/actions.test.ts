import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockCouponsCreateWithId,
  mockCouponsUpdate,
  mockCouponsFindById,
  mockValidateCoupon,
  mockComputeDiscount,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockCouponsCreateWithId: vi.fn(),
  mockCouponsUpdate: vi.fn(),
  mockCouponsFindById: vi.fn(),
  mockValidateCoupon: vi.fn(),
  mockComputeDiscount: vi.fn(),
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

vi.mock("../../../../repositories", () => ({
  couponsRepository: {
    createWithId: mockCouponsCreateWithId,
    update: mockCouponsUpdate,
    findById: mockCouponsFindById,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  validateCoupon: mockValidateCoupon,
  computeDiscount: mockComputeDiscount,
}));

import {
  applyCouponAction,
  createCouponAction,
  updateCouponAction,
  deactivateCouponAction,
} from "../actions";

function makeBuyerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-admin-1", email: "admin@test.com", name: "Admin User", ...overrides };
}

function makeSellerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "store-seller-1", email: "seller@test.com", name: "Seller", ...overrides };
}

function makeCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id: "coupon-welcome10",
    code: "WELCOME10",
    type: "percentage",
    discount: { value: 10, maxDiscount: 50000, minPurchase: 0 },
    scope: "admin",
    validity: { isActive: true, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    code: "WELCOME10",
    name: "Welcome 10% Off",
    type: "percentage",
    scope: "admin",
    discount: { value: 10, maxDiscount: 50000, minPurchase: 0 },
    validity: { isActive: true, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    usage: { totalLimit: 100, perUserLimit: 1, currentUsage: 0 },
    ...overrides,
  };
}

describe("applyCouponAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockValidateCoupon.mockResolvedValue(makeCoupon());
    mockComputeDiscount.mockReturnValue(10000);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await applyCouponAction({ code: "WELCOME10", cartTotal: 100000 });
    expect(result.ok).toBe(false);
  });

  it("missing code → { ok: false }", async () => {
    const result = await applyCouponAction({ cartTotal: 100000 });
    expect(result.ok).toBe(false);
  });

  it("invalid coupon (validateCoupon throws) → { ok: false }", async () => {
    mockValidateCoupon.mockRejectedValue(new Error("Coupon not found or expired"));
    const result = await applyCouponAction({ code: "BADCODE", cartTotal: 100000 });
    expect(result.ok).toBe(false);
  });

  it("valid code → validateCoupon called with user uid", async () => {
    await applyCouponAction({ code: "WELCOME10", cartTotal: 100000 });
    expect(mockValidateCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ code: "WELCOME10" }),
      "user-buyer-1",
    );
  });

  it("valid code → computeDiscount called", async () => {
    await applyCouponAction({ code: "WELCOME10", cartTotal: 100000 });
    expect(mockComputeDiscount).toHaveBeenCalledWith(expect.any(Object), 100000);
  });

  it("success → { ok: true, data: { couponId, code, discount } }", async () => {
    const result = await applyCouponAction({ code: "WELCOME10", cartTotal: 100000 });
    expect(result.ok).toBe(true);
    expect((result as { data: Record<string, unknown> }).data).toMatchObject({
      code: "WELCOME10",
      discount: 10000,
    });
  });
});

describe("createCouponAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockCouponsCreateWithId.mockResolvedValue(makeCoupon());
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await createCouponAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("buyer role → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await createCouponAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("missing code → { ok: false }", async () => {
    const { code: _c, ...input } = makeCreateInput();
    const result = await createCouponAction(input);
    expect(result.ok).toBe(false);
  });

  it("valid → couponsRepository.createWithId called with generated slug id", async () => {
    await createCouponAction(makeCreateInput());
    expect(mockCouponsCreateWithId).toHaveBeenCalledWith(
      "coupon-welcome10",
      expect.objectContaining({ code: "WELCOME10", createdBy: "user-admin-1" }),
    );
  });

  it("valid → currentUsage initialized to 0", async () => {
    await createCouponAction(makeCreateInput());
    const createArg = mockCouponsCreateWithId.mock.calls[0][1];
    expect(createArg.usage.currentUsage).toBe(0);
  });

  it("success → { ok: true }", async () => {
    const result = await createCouponAction(makeCreateInput());
    expect(result.ok).toBe(true);
  });
});

describe("updateCouponAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockCouponsFindById.mockResolvedValue(makeCoupon());
    mockCouponsUpdate.mockResolvedValue(makeCoupon());
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await updateCouponAction("coupon-welcome10", { name: "Updated Name" });
    expect(result.ok).toBe(false);
  });

  it("coupon not found → { ok: false }", async () => {
    mockCouponsFindById.mockResolvedValue(null);
    const result = await updateCouponAction("coupon-missing", { name: "Updated" });
    expect(result.ok).toBe(false);
  });

  it("valid → couponsRepository.update called with couponId", async () => {
    await updateCouponAction("coupon-welcome10", { name: "Updated Welcome" });
    expect(mockCouponsUpdate).toHaveBeenCalledWith(
      "coupon-welcome10",
      expect.objectContaining({ name: "Updated Welcome" }),
    );
  });
});

describe("deactivateCouponAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockCouponsUpdate.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await deactivateCouponAction("coupon-welcome10");
    expect(result.ok).toBe(false);
  });

  it("valid → sets isActive: false without deleting", async () => {
    await deactivateCouponAction("coupon-welcome10");
    expect(mockCouponsUpdate).toHaveBeenCalledWith(
      "coupon-welcome10",
      expect.objectContaining({ "validity.isActive": false }),
    );
  });

  it("success → { ok: true }", async () => {
    const result = await deactivateCouponAction("coupon-welcome10");
    expect(result.ok).toBe(true);
  });
});
