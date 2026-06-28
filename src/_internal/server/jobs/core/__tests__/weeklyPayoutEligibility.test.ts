import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetEligibleShiprocket,
  mockPayoutCreate,
  mockMarkPayoutRequested,
  mockStoreFindBySlug,
  mockUserFindById,
} = vi.hoisted(() => ({
  mockGetEligibleShiprocket: vi.fn(),
  mockPayoutCreate: vi.fn(),
  mockMarkPayoutRequested: vi.fn(),
  mockStoreFindBySlug: vi.fn(),
  mockUserFindById: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  orderRepository: {
    getEligibleShiprocket: mockGetEligibleShiprocket,
    markPayoutRequested: mockMarkPayoutRequested,
  },
  payoutRepository: { create: mockPayoutCreate },
  storeRepository: { findBySlug: mockStoreFindBySlug },
  userRepository: { findById: mockUserFindById },
}));

vi.mock("../../../../../core", () => ({
  getDefaultCurrency: () => "INR",
}));

import { runWeeklyPayoutEligibility } from "../weeklyPayoutEligibility";
import type { JobContext } from "../../runtime/types";

function makeBatch() {
  return { commit: vi.fn().mockResolvedValue(undefined), set: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

function makeCtx() {
  const batch = makeBatch();
  return {
    db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeOrder(overrides: { storeId?: string; totalPrice?: number; id?: string } = {}) {
  return {
    id: overrides.id ?? "order-1",
    data: { storeId: overrides.storeId ?? "store-palace", totalPrice: overrides.totalPrice ?? 100000 },
    ref: { id: overrides.id ?? "order-1" },
  };
}

const mockSeller = {
  displayName: "Ravi Kumar",
  email: "ravi@example.com",
  payoutDetails: { method: "upi", upiId: "ravi@paytm" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEligibleShiprocket.mockResolvedValue([]);
  mockPayoutCreate.mockResolvedValue({ id: "payout-weekly-1" });
  mockStoreFindBySlug.mockResolvedValue({ id: "store-palace", ownerId: "seller-uid" });
  mockUserFindById.mockResolvedValue(mockSeller);
  mockMarkPayoutRequested.mockReturnValue(undefined);
});

describe("runWeeklyPayoutEligibility — no eligible orders", () => {
  it("returns early without calling payoutRepository.create", async () => {
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });
});

describe("runWeeklyPayoutEligibility — order missing storeId", () => {
  it("skips orders with no storeId and warns", async () => {
    mockGetEligibleShiprocket.mockResolvedValue([
      { id: "order-1", data: {}, ref: {} },
    ]);
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });
});

describe("runWeeklyPayoutEligibility — store/seller not found", () => {
  it("skips store when storeRepository returns null", async () => {
    mockGetEligibleShiprocket.mockResolvedValue([makeOrder()]);
    mockStoreFindBySlug.mockResolvedValue(null);
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    expect(mockPayoutCreate).not.toHaveBeenCalled();
    expect(ctx.logger.warn).toHaveBeenCalled();
  });

  it("skips store when seller not found", async () => {
    mockGetEligibleShiprocket.mockResolvedValue([makeOrder()]);
    mockUserFindById.mockResolvedValue(null);
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });
});

describe("runWeeklyPayoutEligibility — fee calculation (5% platform only)", () => {
  it("deducts only 5% platform fee — no gateway fee, no GST", async () => {
    mockGetEligibleShiprocket.mockResolvedValue([makeOrder({ totalPrice: 100000 })]);
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    const callArg = mockPayoutCreate.mock.calls[0][0];
    expect(callArg.grossAmount).toBe(100000);
    expect(callArg.platformFee).toBe(5000);
    // No gatewayFee or gstAmount fields in weekly payout
    expect(callArg.gatewayFee).toBeUndefined();
    expect(callArg.gstAmount).toBeUndefined();
    expect(callArg.amount).toBe(95000);
  });
});

describe("runWeeklyPayoutEligibility — multiple stores", () => {
  it("creates a separate payout per store", async () => {
    mockGetEligibleShiprocket.mockResolvedValue([
      makeOrder({ storeId: "store-a", id: "order-1" }),
      makeOrder({ storeId: "store-b", id: "order-2" }),
    ]);
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    expect(mockPayoutCreate).toHaveBeenCalledTimes(2);
  });
});

describe("runWeeklyPayoutEligibility — batch marking", () => {
  it("calls markPayoutRequested once per eligible order", async () => {
    mockGetEligibleShiprocket.mockResolvedValue([
      makeOrder({ id: "order-1" }),
      makeOrder({ id: "order-2" }),
    ]);
    const ctx = makeCtx();
    await runWeeklyPayoutEligibility(ctx);
    expect(mockMarkPayoutRequested).toHaveBeenCalledTimes(2);
  });
});
