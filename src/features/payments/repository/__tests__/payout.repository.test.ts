import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
  };
});

vi.mock("../../../../security", () => ({
  encryptPiiFields: (d: Record<string, unknown>) => d,
  decryptPiiFields: (d: Record<string, unknown>) => d,
  addPiiIndices: (d: Record<string, unknown>) => d,
  encryptPayoutBankAccount: (d: unknown) => d,
  decryptPayoutBankAccount: (d: unknown) => d,
  PAYOUT_PII_FIELDS: ["sellerName", "sellerEmail"],
  PAYOUT_PII_INDEX_MAP: {},
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { PayoutRepository } from "../payout.repository";

const repo = new PayoutRepository();

function makePayoutDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "payout-misty-20260101-a1b2c3",
    storeId: "store-pokemon-palace",
    sellerName: "Misty Singh",
    sellerEmail: "misty@pokemon.com",
    amount: 50000, // paise
    netAmount: 50000,
    status: "pending",
    orderIds: ["order-1-20260101-abc", "order-2-20260101-def"],
    requestedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    refundDeductions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  db.runTransaction.mockImplementation(
    async (fn: (txn: typeof mockTxn) => Promise<unknown>) => fn(mockTxn),
  );
  mockTxn.get.mockResolvedValue(makeSnap(null));
  mockTxn.update.mockReturnValue(undefined);
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("PayoutRepository.create", () => {
  it("creates payout with status: pending", async () => {
    const result = await repo.create({
      storeId: "store-1",
      sellerName: "Arun",
      sellerEmail: "arun@test.com",
      amount: 10000,
      orderIds: [],
      paymentMethod: "upi",
    } as never);
    expect(result.status).toBe("pending");
  });

  it("persists the payout to Firestore", async () => {
    await repo.create({
      storeId: "store-1",
      sellerName: "Arun",
      sellerEmail: "arun@test.com",
      amount: 10000,
      orderIds: [],
      paymentMethod: "upi",
    } as never);
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("sets requestedAt timestamp", async () => {
    const result = await repo.create({
      storeId: "store-1",
      sellerName: "Arun",
      sellerEmail: "arun@test.com",
      amount: 10000,
      orderIds: [],
      paymentMethod: "upi",
    } as never);
    expect(result.requestedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// markProcessing
// ---------------------------------------------------------------------------
describe("PayoutRepository.markProcessing", () => {
  it("sets status: processing on the provided ref", async () => {
    await repo.markProcessing(mockDocRef as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" }),
    );
  });

  it("sets processedAt timestamp", async () => {
    await repo.markProcessing(mockDocRef as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ processedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// recordSuccess
// ---------------------------------------------------------------------------
describe("PayoutRepository.recordSuccess", () => {
  it("stores razorpayPayoutId on the payout", async () => {
    await repo.recordSuccess(mockDocRef as never, "razorpay-payout-123", "processed");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ razorpayPayoutId: "razorpay-payout-123" }),
    );
  });

  it("stores razorpayStatus on the payout", async () => {
    await repo.recordSuccess(mockDocRef as never, "payout-abc", "processed");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ razorpayStatus: "processed" }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    await repo.recordSuccess(mockDocRef as never, "payout-abc", "processed");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// recordFailure
// ---------------------------------------------------------------------------
describe("PayoutRepository.recordFailure", () => {
  it("isFinal=true → sets status: failed", async () => {
    await repo.recordFailure(mockDocRef as never, 3, "Insufficient funds", true);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("isFinal=false → keeps status: pending (retry)", async () => {
    await repo.recordFailure(mockDocRef as never, 1, "Timeout", false);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("stores failureCount", async () => {
    await repo.recordFailure(mockDocRef as never, 2, "Network error", false);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ failureCount: 2 }),
    );
  });

  it("stores lastFailureReason", async () => {
    await repo.recordFailure(mockDocRef as never, 1, "Account blocked", false);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastFailureReason: "Account blocked" }),
    );
  });
});

// ---------------------------------------------------------------------------
// applyRefundDeduction
// ---------------------------------------------------------------------------
describe("PayoutRepository.applyRefundDeduction", () => {
  it("throws when payout not found in transaction", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await expect(
      repo.applyRefundDeduction("payout-ghost", {
        orderId: "order-1",
        deductedAmount: 100,
      } as never),
    ).rejects.toThrow(/not found/i);
  });

  it("throws when payout status is not pending", async () => {
    const payout = makePayoutDoc({ status: "completed" });
    mockTxn.get.mockResolvedValue({ exists: true, id: payout.id, data: () => payout });
    await expect(
      repo.applyRefundDeduction("payout-1", {
        orderId: "order-1",
        deductedAmount: 100,
      } as never),
    ).rejects.toThrow(/status/i);
  });

  it("computes netAmount = amount - totalDeducted", async () => {
    const payout = makePayoutDoc({ amount: 50000, refundDeductions: [] });
    mockTxn.get.mockResolvedValue({ exists: true, id: payout.id, data: () => payout });
    const result = await repo.applyRefundDeduction("payout-1", {
      orderId: "order-1",
      deductedAmount: 10000,
    } as never);
    expect(result.netAmount).toBe(40000);
  });

  it("netAmount is floored at 0 when deduction exceeds amount", async () => {
    const payout = makePayoutDoc({ amount: 5000, refundDeductions: [] });
    mockTxn.get.mockResolvedValue({ exists: true, id: payout.id, data: () => payout });
    const result = await repo.applyRefundDeduction("payout-1", {
      orderId: "order-1",
      deductedAmount: 10000, // more than amount
    } as never);
    expect(result.netAmount).toBe(0);
  });

  it("accumulates multiple deductions correctly", async () => {
    const existing = [{ orderId: "order-old", deductedAmount: 5000, appliedAt: new Date() }];
    const payout = makePayoutDoc({ amount: 50000, refundDeductions: existing });
    mockTxn.get.mockResolvedValue({ exists: true, id: payout.id, data: () => payout });
    const result = await repo.applyRefundDeduction("payout-1", {
      orderId: "order-new",
      deductedAmount: 10000,
    } as never);
    // total deducted = 5000 + 10000 = 15000, net = 50000 - 15000 = 35000
    expect(result.netAmount).toBe(35000);
  });

  it("sets appliedAt on the deduction entry", async () => {
    const payout = makePayoutDoc({ amount: 50000, refundDeductions: [] });
    mockTxn.get.mockResolvedValue({ exists: true, id: payout.id, data: () => payout });
    const result = await repo.applyRefundDeduction("payout-1", {
      orderId: "order-1",
      deductedAmount: 100,
    } as never);
    const lastDeduction = result.refundDeductions![result.refundDeductions!.length - 1];
    expect(lastDeduction.appliedAt).toBeInstanceOf(Date);
  });

  it("uses a Firestore transaction for atomic read-modify-write", async () => {
    const payout = makePayoutDoc({ amount: 50000, refundDeductions: [] });
    mockTxn.get.mockResolvedValue({ exists: true, id: payout.id, data: () => payout });
    await repo.applyRefundDeduction("payout-1", {
      orderId: "order-1",
      deductedAmount: 100,
    } as never);
    expect(db.runTransaction).toHaveBeenCalledOnce();
    expect(mockTxn.get).toHaveBeenCalledOnce();
    expect(mockTxn.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// findPendingByStore
// ---------------------------------------------------------------------------
describe("PayoutRepository.findPendingByStore", () => {
  it("returns null when no pending payout found", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    const result = await repo.findPendingByStore("store-1");
    expect(result).toBeNull();
  });

  it("queries storeId AND status=pending", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    await repo.findPendingByStore("store-abc");
    expect(mockCollection.where).toHaveBeenCalledWith("storeId", "==", "store-abc");
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "pending");
  });

  it("applies limit of 1 (most recent only)", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    await repo.findPendingByStore("store-abc");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });

  it("returns the payout when found", async () => {
    const payout = makePayoutDoc({ status: "pending" });
    mockQuery.get.mockResolvedValue({
      docs: [{ id: payout.id, data: () => payout }],
      empty: false,
      size: 1,
    });
    const result = await repo.findPendingByStore("store-pokemon-palace");
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPaidOutOrderIds
// ---------------------------------------------------------------------------
describe("PayoutRepository.getPaidOutOrderIds", () => {
  it("returns empty Set when no matching payouts", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    const ids = await repo.getPaidOutOrderIds("store-1");
    expect(ids.size).toBe(0);
  });

  it("collects all orderIds from matching payout documents", async () => {
    const payout1 = makePayoutDoc({ orderIds: ["order-A", "order-B"] });
    const payout2 = makePayoutDoc({ id: "payout-2", orderIds: ["order-C"] });
    mockQuery.get.mockResolvedValue({
      docs: [
        { id: payout1.id, data: () => payout1 },
        { id: payout2.id, data: () => payout2 },
      ],
      empty: false,
      size: 2,
    });
    const ids = await repo.getPaidOutOrderIds("store-pokemon-palace");
    expect(ids.has("order-A")).toBe(true);
    expect(ids.has("order-B")).toBe(true);
    expect(ids.has("order-C")).toBe(true);
  });

  it("queries storeId AND status in [pending, processing, completed]", async () => {
    mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
    await repo.getPaidOutOrderIds("store-1");
    expect(mockCollection.where).toHaveBeenCalledWith("storeId", "==", "store-1");
    expect(mockQuery.where).toHaveBeenCalledWith(
      "status",
      "in",
      expect.arrayContaining(["pending", "processing", "completed"]),
    );
  });

  it("handles payout with no orderIds field gracefully", async () => {
    const payout = { ...makePayoutDoc(), orderIds: undefined };
    mockQuery.get.mockResolvedValue({
      docs: [{ id: payout.id, data: () => payout }],
      empty: false,
      size: 1,
    });
    const ids = await repo.getPaidOutOrderIds("store-1");
    expect(ids.size).toBe(0);
  });
});
