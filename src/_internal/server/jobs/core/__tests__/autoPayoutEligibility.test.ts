import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetEligibleAutomatic,
  mockPayoutCreate,
  mockMarkPayoutRequested,
  mockStoreFindBySlug,
  mockUserFindById,
  mockGetSingleton,
} = vi.hoisted(() => ({
  mockGetEligibleAutomatic: vi.fn(),
  mockPayoutCreate: vi.fn(),
  mockMarkPayoutRequested: vi.fn(),
  mockStoreFindBySlug: vi.fn(),
  mockUserFindById: vi.fn(),
  mockGetSingleton: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  orderRepository: {
    getEligibleAutomatic: mockGetEligibleAutomatic,
    markPayoutRequested: mockMarkPayoutRequested,
  },
  payoutRepository: { create: mockPayoutCreate },
  storeRepository: { findBySlug: mockStoreFindBySlug },
  userRepository: { findById: mockUserFindById },
  siteSettingsRepository: { getSingleton: mockGetSingleton },
}));

vi.mock("../../../../../core/index", () => ({
  getDefaultCurrency: () => "INR",
}));

import { runAutoPayoutEligibility } from "../autoPayoutEligibility";
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
    env: vi.fn().mockReturnValue("true"),
  } as unknown as JobContext;
}

function makeOrder(overrides: { storeId?: string; totalPrice?: number; id?: string } = {}) {
  return {
    id: overrides.id ?? "order-1",
    data: { storeId: overrides.storeId ?? "store-palace", totalPrice: overrides.totalPrice ?? 100000 },
    ref: { id: "order-1" },
  };
}

const mockSeller = {
  displayName: "Ravi Kumar",
  email: "ravi@example.com",
  payoutDetails: { method: "upi", upiId: "ravi@paytm" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEligibleAutomatic.mockResolvedValue([]);
  mockPayoutCreate.mockResolvedValue({ id: "payout-1" });
  mockStoreFindBySlug.mockResolvedValue({ id: "store-palace", ownerId: "seller-uid" });
  mockUserFindById.mockResolvedValue(mockSeller);
  mockMarkPayoutRequested.mockReturnValue(undefined);
  mockGetSingleton.mockResolvedValue({
    commissions: { platformFeePercent: 5, gstPercent: 18, gatewayFeePercent: 2, minimumTransactionFee: 0 },
  });
});

describe("runAutoPayoutEligibility — no eligible orders", () => {
  it("returns early without calling payoutRepository.create", async () => {
    const ctx = makeCtx();
    await runAutoPayoutEligibility(ctx);
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });

  it("logs info when no eligible orders", async () => {
    const ctx = makeCtx();
    await runAutoPayoutEligibility(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no/i));
  });
});

describe("runAutoPayoutEligibility — order missing storeId", () => {
  it("skips orders with no storeId and warns", async () => {
    const ctx = makeCtx();
    mockGetEligibleAutomatic.mockResolvedValue([
      { id: "order-1", data: { storeId: null, totalPrice: 50000 }, ref: {} },
    ]);
    await runAutoPayoutEligibility(ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });
});

describe("runAutoPayoutEligibility — store/seller not found", () => {
  it("skips store when storeRepository returns null", async () => {
    const ctx = makeCtx();
    mockGetEligibleAutomatic.mockResolvedValue([makeOrder()]);
    mockStoreFindBySlug.mockResolvedValue(null);
    await runAutoPayoutEligibility(ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });

  it("skips store when userRepository returns null", async () => {
    const ctx = makeCtx();
    mockGetEligibleAutomatic.mockResolvedValue([makeOrder()]);
    mockUserFindById.mockResolvedValue(null);
    await runAutoPayoutEligibility(ctx);
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });
});

describe("runAutoPayoutEligibility — fee calculation", () => {
  it("creates payout with correct netAmount after 5% platform + 2.36% gateway + GST", async () => {
    const ctx = makeCtx();
    const gross = 100000;
    mockGetEligibleAutomatic.mockResolvedValue([makeOrder({ totalPrice: gross })]);
    await runAutoPayoutEligibility(ctx);

    const callArg = mockPayoutCreate.mock.calls[0][0];
    expect(callArg.grossAmount).toBe(gross);
    // platformFee = 100000 * 5% = 5000
    // gatewayFee = 100000 * 2% = 2000
    // gstAmount = 5000 * 18% = 900
    // net = 100000 - 5000 - 2000 - 900 = 92100
    expect(callArg.platformFee).toBe(5000);
    expect(callArg.gatewayFee).toBe(2000);
    expect(callArg.gstAmount).toBe(900);
    expect(callArg.amount).toBe(92100);
  });

  it("sets isAutomatic: true on the payout", async () => {
    const ctx = makeCtx();
    mockGetEligibleAutomatic.mockResolvedValue([makeOrder()]);
    await runAutoPayoutEligibility(ctx);
    expect(mockPayoutCreate.mock.calls[0][0].isAutomatic).toBe(true);
  });
});

describe("runAutoPayoutEligibility — multiple stores", () => {
  it("creates separate payout per store", async () => {
    const ctx = makeCtx();
    mockGetEligibleAutomatic.mockResolvedValue([
      makeOrder({ storeId: "store-a", id: "order-1" }),
      makeOrder({ storeId: "store-b", id: "order-2" }),
    ]);
    await runAutoPayoutEligibility(ctx);
    expect(mockPayoutCreate).toHaveBeenCalledTimes(2);
  });
});

describe("runAutoPayoutEligibility — batch marking", () => {
  it("calls markPayoutRequested for each order", async () => {
    const ctx = makeCtx();
    mockGetEligibleAutomatic.mockResolvedValue([
      makeOrder({ id: "order-1" }),
      makeOrder({ id: "order-2" }),
    ]);
    await runAutoPayoutEligibility(ctx);
    expect(mockMarkPayoutRequested).toHaveBeenCalledTimes(2);
  });

  it("commits the batch after marking orders", async () => {
    const batchObj = makeBatch();
    const ctx = {
      db: { batch: vi.fn(() => batchObj) } as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      env: vi.fn().mockReturnValue("true"),
    } as unknown as JobContext;
    mockGetEligibleAutomatic.mockResolvedValue([makeOrder()]);
    await runAutoPayoutEligibility(ctx);
    expect(batchObj.commit).toHaveBeenCalledOnce();
  });
});
