import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPayoutFindPendingByStore,
  mockPayoutApplyRefundDeduction,
} = vi.hoisted(() => ({
  mockPayoutFindPendingByStore: vi.fn(),
  mockPayoutApplyRefundDeduction: vi.fn(),
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
  payoutRepository: {
    findPendingByStore: mockPayoutFindPendingByStore,
    applyRefundDeduction: mockPayoutApplyRefundDeduction,
  },
}));

import { applyRefundDeductionAction } from "../actions";

function makePendingPayout(overrides: Record<string, unknown> = {}) {
  return {
    id: "payout-seller-1-20260629-xyz",
    storeId: "store-seller-1",
    status: "PENDING",
    amount: 1000000,
    orderIds: ["order-1-20260629-abc", "order-2-20260629-def"],
    ...overrides,
  };
}

function makeInput(overrides: Partial<{
  storeId: string;
  orderId: string;
  refundId: string;
  refundedAmountInPaise: number;
  platformFeeRate: number;
  reason: string;
}> = {}) {
  return {
    storeId: "store-seller-1",
    orderId: "order-1-20260629-abc",
    refundId: "refund-xyz123",
    refundedAmountInPaise: 100000,
    reason: "Customer returned item",
    ...overrides,
  };
}

describe("applyRefundDeductionAction — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPayoutFindPendingByStore.mockResolvedValue(makePendingPayout());
    mockPayoutApplyRefundDeduction.mockResolvedValue({ id: "payout-seller-1-20260629-xyz", amount: 900000 });
  });

  it("refundedAmountInPaise === 0 → { ok: false, error: /must be positive/i }", async () => {
    const result = await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: 0 }));
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/must be positive/i);
  });

  it("refundedAmountInPaise < 0 → { ok: false, error: /must be positive/i }", async () => {
    const result = await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: -500 }));
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/must be positive/i);
  });
});

describe("applyRefundDeductionAction — no pending payout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPayoutFindPendingByStore.mockResolvedValue(null);
  });

  it("payoutRepository.findPendingByStore returns null → { ok: true, data: { applied: false, reason: 'no_pending_payout' } }", async () => {
    const result = await applyRefundDeductionAction(makeInput());
    expect(result.ok).toBe(true);
    expect((result as { data: { applied: boolean; reason: string } }).data).toEqual({
      applied: false,
      reason: "no_pending_payout",
    });
  });
});

describe("applyRefundDeductionAction — order not in payout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPayoutFindPendingByStore.mockResolvedValue(
      makePendingPayout({ orderIds: ["order-other-1", "order-other-2"] }),
    );
  });

  it("pending payout exists but orderId not in pending.orderIds → { ok: true, data: { applied: false, reason: 'order_not_in_payout' } }", async () => {
    const result = await applyRefundDeductionAction(makeInput({ orderId: "order-1-20260629-abc" }));
    expect(result.ok).toBe(true);
    expect((result as { data: { applied: boolean; reason: string } }).data).toEqual({
      applied: false,
      reason: "order_not_in_payout",
    });
  });
});

describe("applyRefundDeductionAction — fee rate calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPayoutFindPendingByStore.mockResolvedValue(makePendingPayout());
    mockPayoutApplyRefundDeduction.mockImplementation((_id, args) =>
      Promise.resolve({ id: "payout-1", amount: 900000, ...args }),
    );
  });

  it("platformFeeRate not provided → defaults to 0.05; deductedAmount = round(1000 * 0.95) = 950", async () => {
    await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: 1000 }));
    const callArg = mockPayoutApplyRefundDeduction.mock.calls[0][1];
    expect(callArg.deductedAmount).toBe(950);
  });

  it("platformFeeRate = 0.10 → deductedAmount = round(1000 * 0.90) = 900", async () => {
    await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: 1000, platformFeeRate: 0.10 }));
    const callArg = mockPayoutApplyRefundDeduction.mock.calls[0][1];
    expect(callArg.deductedAmount).toBe(900);
  });

  it("platformFeeRate = 0.00 → deductedAmount = round(1000 * 1.00) = 1000", async () => {
    await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: 1000, platformFeeRate: 0.0 }));
    const callArg = mockPayoutApplyRefundDeduction.mock.calls[0][1];
    expect(callArg.deductedAmount).toBe(1000);
  });

  it("deductedAmount is an integer (Math.round applied; 333 * 0.95 = 316.35 → 316)", async () => {
    await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: 333 }));
    const callArg = mockPayoutApplyRefundDeduction.mock.calls[0][1];
    expect(Number.isInteger(callArg.deductedAmount)).toBe(true);
    expect(callArg.deductedAmount).toBe(316);
  });
});

describe("applyRefundDeductionAction — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPayoutFindPendingByStore.mockResolvedValue(makePendingPayout());
  });

  it("valid → payoutRepository.applyRefundDeduction called with orderId, refundId, refundedAmount, deductedAmount, reason", async () => {
    mockPayoutApplyRefundDeduction.mockResolvedValue({ id: "payout-1", amount: 900000, netAmount: 895000 });
    await applyRefundDeductionAction(makeInput({ refundedAmountInPaise: 100000 }));
    expect(mockPayoutApplyRefundDeduction).toHaveBeenCalledWith(
      "payout-seller-1-20260629-xyz",
      expect.objectContaining({
        orderId: "order-1-20260629-abc",
        refundId: "refund-xyz123",
        refundedAmount: 100000,
        reason: "Customer returned item",
      }),
    );
  });

  it("valid → returns { ok: true, data: { applied: true, payoutId, netAmount } }", async () => {
    mockPayoutApplyRefundDeduction.mockResolvedValue({
      id: "payout-seller-1-20260629-xyz",
      amount: 900000,
      netAmount: 895000,
    });
    const result = await applyRefundDeductionAction(makeInput());
    expect(result.ok).toBe(true);
    const data = (result as { data: { applied: boolean; payoutId: string; netAmount: number } }).data;
    expect(data.applied).toBe(true);
    expect(data.payoutId).toBe("payout-seller-1-20260629-xyz");
    expect(data.netAmount).toBe(895000);
  });

  it("updated.netAmount present → netAmount = updated.netAmount", async () => {
    mockPayoutApplyRefundDeduction.mockResolvedValue({ id: "payout-1", amount: 900000, netAmount: 895000 });
    const result = await applyRefundDeductionAction(makeInput());
    const data = (result as { data: { netAmount: number } }).data;
    expect(data.netAmount).toBe(895000);
  });

  it("updated.netAmount absent → netAmount = updated.amount (fallback)", async () => {
    mockPayoutApplyRefundDeduction.mockResolvedValue({ id: "payout-1", amount: 900000 });
    const result = await applyRefundDeductionAction(makeInput());
    const data = (result as { data: { netAmount: number } }).data;
    expect(data.netAmount).toBe(900000);
  });
});
