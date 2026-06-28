import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: these must be declared before vi.mock factories reference them
const {
  mockOrderFindById,
  mockPostRefundEvent,
  mockPaymentRefund,
  mockApplyRefundDeduction,
  mockCodesGet,
} = vi.hoisted(() => {
  const mockCodesQuery = {
    where: vi.fn(),
    limit: vi.fn(),
    get: vi.fn(),
  };
  mockCodesQuery.where.mockReturnValue(mockCodesQuery);
  mockCodesQuery.limit.mockReturnValue(mockCodesQuery);

  return {
    mockOrderFindById: vi.fn(),
    mockPostRefundEvent: vi.fn(),
    mockPaymentRefund: vi.fn(),
    mockApplyRefundDeduction: vi.fn(),
    mockCodesGet: mockCodesQuery.get,
    _mockCodesQuery: mockCodesQuery,
  };
});

// Mock appkit/server BEFORE other imports to avoid loading broken dist/client.js
vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async <T>(fn: () => Promise<T>) => {
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  },
  isSoftBanned: vi.fn(() => false),
}));

vi.mock("../../../../../", () => ({
  orderRepository: {
    findById: mockOrderFindById,
    postRefundEvent: mockPostRefundEvent,
  },
}));

vi.mock("../../../../../contracts/registry", () => ({
  getProviders: vi.fn(() => ({
    payment: { refund: mockPaymentRefund },
  })),
}));

// Mock the firebase-admin sub-module that provides getAdminDb
// Chain: db.collection(PRODUCTS).doc(productId).collection(CODES).where("orderId","==",orderId).limit(1).get()
vi.mock("../../../../../providers/db-firebase/admin", () => {
  const mockCodesQuery = { where: vi.fn(), limit: vi.fn(), get: mockCodesGet };
  mockCodesQuery.where.mockReturnValue(mockCodesQuery);
  mockCodesQuery.limit.mockReturnValue(mockCodesQuery);
  const mockCodesCollection = { where: vi.fn() };
  mockCodesCollection.where.mockReturnValue(mockCodesQuery);
  const mockDoc = { collection: vi.fn(() => mockCodesCollection) };
  const mockTopCollection = { doc: vi.fn(() => mockDoc) };
  const mockDb = { collection: vi.fn(() => mockTopCollection) };
  return { getAdminDb: () => mockDb, getAdminAuth: vi.fn(), getAdminStorage: vi.fn() };
});

vi.mock("../../payouts/actions", () => ({
  applyRefundDeductionAction: mockApplyRefundDeduction,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { processRefundAction } from "../actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    storeId: "store-A",
    totalPrice: 10000,
    paymentMethod: "razorpay",
    paymentId: "pay_abc123",
    isNonRefundable: false,
    items: [],
    ...overrides,
  };
}

function refundInput(overrides: Partial<Record<string, unknown>> = {}): Parameters<typeof processRefundAction>[0] {
  return {
    orderId: "order-1",
    type: "partial",
    amountInPaise: 5000,
    reason: "damaged item",
    confirmIrrevocable: true,
    refundedBy: "admin-uid",
    method: "manual",
    ...overrides,
  } as Parameters<typeof processRefundAction>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderFindById.mockResolvedValue(makeOrder());
  mockPostRefundEvent.mockResolvedValue(undefined);
  mockPaymentRefund.mockResolvedValue({ id: "rfnd_123" });
  mockApplyRefundDeduction.mockResolvedValue(undefined);
  mockCodesGet.mockResolvedValue({ empty: true, docs: [] });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("processRefundAction — validation guards", () => {
  it("order not found → ok: false", async () => {
    mockOrderFindById.mockResolvedValue(null);
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("amount <= 0 → ok: false (validation)", async () => {
    const result = await processRefundAction(refundInput({ amountInPaise: 0 }));
    expect(result.ok).toBe(false);
  });

  it("negative amount → ok: false (validation)", async () => {
    const result = await processRefundAction(refundInput({ amountInPaise: -100 }));
    expect(result.ok).toBe(false);
  });

  it("amount > order.totalPrice → ok: false", async () => {
    const result = await processRefundAction(refundInput({ amountInPaise: 10001 }));
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/exceeds/i);
  });

  it("amount === order.totalPrice → ok: true (full refund, not exceeds)", async () => {
    const result = await processRefundAction(refundInput({ amountInPaise: 10000 }));
    expect(result.ok).toBe(true);
  });

  it("isNonRefundable: true → ok: false", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ isNonRefundable: true }));
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/non-refundable/i);
  });
});

describe("processRefundAction — digital code guard", () => {
  it("digital code already claimed → ok: false", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({
      items: [{ productId: "digital-prod-1", listingType: "digital-code" }],
    }));
    mockCodesGet.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ status: "claimed" }) }],
    });
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/digital code|revealed/i);
  });

  it("digital code with status 'available' → refund allowed", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({
      items: [{ productId: "digital-prod-1", listingType: "digital-code" }],
    }));
    mockCodesGet.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ status: "available" }) }],
    });
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(true);
  });

  it("no digital code items → digital code check is skipped", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ items: [] }));
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(true);
    expect(mockCodesGet).not.toHaveBeenCalled();
  });

  it("digital code collection query returns empty → refund allowed", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({
      items: [{ productId: "digital-prod-1", listingType: "digital-code" }],
    }));
    mockCodesGet.mockResolvedValue({ empty: true, docs: [] });
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(true);
  });
});

describe("processRefundAction — Razorpay path", () => {
  it("calls payment.refund with correct paymentId and amount", async () => {
    const result = await processRefundAction(refundInput({
      method: "razorpay",
      razorpayPaymentId: "pay_abc123",
      amountInPaise: 5000,
    }));
    expect(result.ok).toBe(true);
    expect(mockPaymentRefund).toHaveBeenCalledWith("pay_abc123", 5000);
  });

  it("Razorpay refund API failure → ok: false, postRefundEvent NOT called", async () => {
    mockPaymentRefund.mockRejectedValue(new Error("Razorpay API error"));
    const result = await processRefundAction(refundInput({
      method: "razorpay",
      razorpayPaymentId: "pay_abc123",
    }));
    expect(result.ok).toBe(false);
    expect(mockPostRefundEvent).not.toHaveBeenCalled();
  });

  it("razorpayRefundId from provider is stored in event", async () => {
    mockPaymentRefund.mockResolvedValue({ id: "rfnd_xyz789" });
    await processRefundAction(refundInput({
      method: "razorpay",
      razorpayPaymentId: "pay_abc123",
    }));
    expect(mockPostRefundEvent).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ razorpayRefundId: "rfnd_xyz789" }),
      expect.any(Boolean),
    );
  });
});

describe("processRefundAction — manual path", () => {
  it("does NOT call payment.refund for manual refunds", async () => {
    await processRefundAction(refundInput({ method: "manual" }));
    expect(mockPaymentRefund).not.toHaveBeenCalled();
  });

  it("calls postRefundEvent without razorpayRefundId", async () => {
    await processRefundAction(refundInput({ method: "manual" }));
    const event = mockPostRefundEvent.mock.calls[0][1] as Record<string, unknown>;
    expect(event.razorpayRefundId).toBeUndefined();
  });

  it("stores manualTransactionId when provided", async () => {
    await processRefundAction(refundInput({ method: "manual", manualTransactionId: "TXN123" }));
    const event = mockPostRefundEvent.mock.calls[0][1] as Record<string, unknown>;
    expect(event.manualTransactionId).toBe("TXN123");
  });
});

describe("processRefundAction — success path", () => {
  it("calls orderRepository.postRefundEvent with correct orderId", async () => {
    await processRefundAction(refundInput());
    expect(mockPostRefundEvent).toHaveBeenCalledWith(
      "order-1",
      expect.any(Object),
      expect.any(Boolean),
    );
  });

  it("partial amount: isFull = false passed to postRefundEvent", async () => {
    await processRefundAction(refundInput({ amountInPaise: 5000 }));
    const isFull = mockPostRefundEvent.mock.calls[0][2] as boolean;
    expect(isFull).toBe(false);
  });

  it("full amount: isFull = true passed to postRefundEvent", async () => {
    await processRefundAction(refundInput({ amountInPaise: 10000 }));
    const isFull = mockPostRefundEvent.mock.calls[0][2] as boolean;
    expect(isFull).toBe(true);
  });

  it("returns ok: true with success: true and a refundId UUID", async () => {
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(true);
    const data = (result as { ok: true; data: { success: boolean; refundId: string } }).data;
    expect(data.success).toBe(true);
    expect(data.refundId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("event contains reason, refundedBy, and refundedAt", async () => {
    await processRefundAction(refundInput({ reason: "broken product", refundedBy: "admin-1" }));
    const event = mockPostRefundEvent.mock.calls[0][1] as Record<string, unknown>;
    expect(event.reason).toBe("broken product");
    expect(event.refundedBy).toBe("admin-1");
    expect(event.refundedAt).toBeInstanceOf(Date);
  });
});

describe("processRefundAction — payout deduction", () => {
  it("triggers applyRefundDeductionAction when order has storeId", async () => {
    await processRefundAction(refundInput({ amountInPaise: 5000 }));
    expect(mockApplyRefundDeduction).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: "store-A",
        orderId: "order-1",
        refundedAmountInPaise: 5000,
      }),
    );
  });

  it("does NOT call applyRefundDeductionAction when order has no storeId", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ storeId: undefined }));
    await processRefundAction(refundInput());
    expect(mockApplyRefundDeduction).not.toHaveBeenCalled();
  });

  it("deduction failure does NOT fail the refund (fire-and-forget)", async () => {
    mockApplyRefundDeduction.mockRejectedValue(new Error("Payout service unavailable"));
    const result = await processRefundAction(refundInput());
    expect(result.ok).toBe(true);
  });
});
