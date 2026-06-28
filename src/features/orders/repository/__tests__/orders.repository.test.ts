import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => db,
  prepareForFirestore: (data: Record<string, unknown>) => data,
  BaseRepository: class {
    protected collection: string;
    protected get db() { return db; }
    constructor(col: string) { this.collection = col; }
    protected getCollection() { return db.collection(this.collection); }
    protected mapDoc(snap: { id: string; data: () => Record<string, unknown> }) {
      return { id: snap.id, ...snap.data() };
    }
    async findById(id: string) {
      const snap = await db.collection(this.collection).doc(id).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    }
    async findBy(field: string, value: unknown) {
      const snap = await db.collection(this.collection).where(field, "==", value).get();
      return snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() }));
    }
    async update(id: string, data: Record<string, unknown>) {
      await db.collection(this.collection).doc(id).update(data);
      return { id, ...data };
    }
  },
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../security", () => ({
  ORDER_PII_FIELDS: ["shippingAddress.phone", "shippingAddress.fullName"],
  encryptPiiFields: (data: Record<string, unknown>) => data,
  decryptPiiFields: (data: Record<string, unknown>) => data,
}));

vi.mock("../../../../contracts/field-ops", () => ({
  serverTimestamp: () => new Date(),
}));

vi.mock("../../schemas", async () => ({
  ORDER_COLLECTION: "orders",
  OrderStatusValues: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
  },
  createOrderId: () => "order-1-20260101-abc123",
}));

import { OrderRepository } from "../orders.repository";

const repo = new OrderRepository();

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  mockCollection.doc.mockReturnValue(mockDocRef);
  db.collection.mockReturnValue(mockCollection);
  db.batch.mockReturnValue(mockBatch);
});

describe("OrderRepository.cancelOrder", () => {
  it("sets status: cancelled", async () => {
    mockDocRef.update.mockResolvedValue(undefined);
    await repo.cancelOrder("order-1", "user changed mind");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("stores cancellation reason", async () => {
    await repo.cancelOrder("order-1", "payment failed");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ cancellationReason: "payment failed" }),
    );
  });
});

describe("OrderRepository.updateStatus", () => {
  it("updates status and updatedAt", async () => {
    await repo.updateStatus("order-1", "shipped");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "shipped", updatedAt: expect.any(Date) }),
    );
  });
});

describe("OrderRepository.hasUserPurchased", () => {
  it("returns true when confirmed order exists for user + product", async () => {
    const docs = makeQuerySnap([
      { id: "o1", data: { userId: "user-1", productId: "product-x", status: "confirmed" } },
    ]);
    mockQuery.get.mockResolvedValue(docs);
    const result = await repo.hasUserPurchased("user-1", "product-x");
    expect(result).toBe(true);
  });

  it("returns true for DELIVERED status", async () => {
    const docs = makeQuerySnap([
      { id: "o1", data: { userId: "user-1", productId: "product-x", status: "delivered" } },
    ]);
    mockQuery.get.mockResolvedValue(docs);
    const result = await repo.hasUserPurchased("user-1", "product-x");
    expect(result).toBe(true);
  });

  it("returns false for CANCELLED status", async () => {
    const docs = makeQuerySnap([
      { id: "o1", data: { userId: "user-1", productId: "product-x", status: "cancelled" } },
    ]);
    mockQuery.get.mockResolvedValue(docs);
    const result = await repo.hasUserPurchased("user-1", "product-x");
    expect(result).toBe(false);
  });

  it("returns false when no orders exist", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.hasUserPurchased("user-1", "product-x");
    expect(result).toBe(false);
  });
});

describe("OrderRepository.countByUserAndProduct", () => {
  it("returns query size (active statuses)", async () => {
    mockQuery.get.mockResolvedValue({ ...makeQuerySnap([
      { id: "o1", data: { status: "pending" } },
      { id: "o2", data: { status: "delivered" } },
    ]), size: 2 });
    const count = await repo.countByUserAndProduct("user-1", "product-x");
    expect(count).toBe(2);
  });
});

describe("OrderRepository.getTimedOutPending", () => {
  it("filters by status=pending, paymentStatus=pending, createdAt < cutoff", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getTimedOutPending(24);
    expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "pending");
    expect(mockQuery.where).toHaveBeenCalledWith("paymentStatus", "==", "pending");
    expect(mockQuery.where).toHaveBeenCalledWith("createdAt", "<", expect.any(Date));
  });

  it("returns docs with id, ref, and data", async () => {
    const docs = makeQuerySnap([
      { id: "o-timeout", data: { status: "pending", paymentStatus: "pending" } },
    ]);
    // Attach .ref to each doc
    docs.docs[0].ref = { id: "o-timeout" } as never;
    mockQuery.get.mockResolvedValue(docs);
    const result = await repo.getTimedOutPending(24);
    expect(result[0].id).toBe("o-timeout");
    expect(result[0].data).toBeDefined();
  });
});

describe("OrderRepository.cancelInBatch", () => {
  it("stages status: cancelled in caller batch, does NOT commit", () => {
    const ref = { id: "order-1" } as never;
    repo.cancelInBatch(mockBatch as never, ref);
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ status: "cancelled", cancellationReason: "payment_timeout" }),
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});

describe("OrderRepository.markPayoutRequested", () => {
  it("stages payoutStatus: requested in caller batch, does NOT commit", () => {
    const ref = { id: "order-1" } as never;
    repo.markPayoutRequested(mockBatch as never, ref, "payout-123");
    expect(mockBatch.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ payoutStatus: "requested", payoutId: "payout-123" }),
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});

describe("OrderRepository.postRefundEvent", () => {
  it("appends refund event to refunds array, sets contestable: false", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({
      status: "delivered",
      refunds: [],
      totalPrice: 10000,
    }));
    const event = { type: "partial", amountInPaise: 5000, reason: "damaged", refundedBy: "admin-1", refundedAt: new Date() };
    await repo.postRefundEvent("order-1", event as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ contestable: false, refunds: [event] }),
    );
  });

  it("becomeRefunded=true → sets status: refunded", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({ status: "delivered", refunds: [], totalPrice: 10000 }));
    const event = { type: "full", amountInPaise: 10000, reason: "return", refundedBy: "admin-1", refundedAt: new Date() };
    await repo.postRefundEvent("order-1", event as never, true);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "refunded" }),
    );
  });

  it("order not found → throws NotFoundError", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const { NotFoundError } = await import("../../../../errors");
    await expect(repo.postRefundEvent("nonexistent", {} as never)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("OrderRepository.createFromAuction", () => {
  it("stages order creation in caller batch with correct fields", () => {
    mockCollection.doc.mockReturnValue({ ...mockDocRef, id: "new-order-id" });
    repo.createFromAuction(mockBatch as never, {
      productId: "auction-test",
      productTitle: "Test Auction",
      userId: "user-1",
      userName: "Ravi Kumar",
      userEmail: "ravi@example.com",
      storeId: "store-1",
      amount: 10000,
      currency: "INR",
      auctionProductId: "auction-test",
    });
    expect(mockBatch.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productId: "auction-test",
        userId: "user-1",
        storeId: "store-1",
        totalPrice: 10000,
        status: "confirmed",
      }),
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});
