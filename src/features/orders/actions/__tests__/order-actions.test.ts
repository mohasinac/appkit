import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, AuthorizationError, ValidationError } from "../../../../errors";

const mockFindById = vi.fn();
const mockUpdate = vi.fn();
const mockCancelOrder = vi.fn();

vi.mock("../../repository/orders.repository", () => ({
  orderRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    cancelOrder: (...args: unknown[]) => mockCancelOrder(...args),
  },
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { cancelOrderItemsForUser, cancelOrderForUser } from "../order-actions";

const BASE_ORDER = {
  id: "order-1",
  userId: "user-1",
  status: "pending",
  items: [
    { productId: "product-a", productTitle: "A", quantity: 1, unitPrice: 1000, totalPrice: 1000 },
    { productId: "product-b", productTitle: "B", quantity: 1, unitPrice: 2000, totalPrice: 2000 },
  ],
};

describe("cancelOrderItemsForUser", () => {
  beforeEach(() => {
    mockFindById.mockReset();
    mockUpdate.mockReset();
    mockCancelOrder.mockReset();
  });

  it("throws NotFoundError when the order does not exist", async () => {
    mockFindById.mockResolvedValue(null);
    await expect(
      cancelOrderItemsForUser("user-1", "order-1", ["product-a"], "changed my mind"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws AuthorizationError when the caller does not own the order", async () => {
    mockFindById.mockResolvedValue({ ...BASE_ORDER, userId: "someone-else" });
    await expect(
      cancelOrderItemsForUser("user-1", "order-1", ["product-a"], "reason"),
    ).rejects.toThrow(AuthorizationError);
  });

  it("throws ValidationError when the order is not in a cancellable status", async () => {
    mockFindById.mockResolvedValue({ ...BASE_ORDER, status: "shipped" });
    await expect(
      cancelOrderItemsForUser("user-1", "order-1", ["product-a"], "reason"),
    ).rejects.toThrow(ValidationError);
  });

  it("marks only the selected item cancelled and sets refundPending, without touching the other item", async () => {
    mockFindById.mockResolvedValue(BASE_ORDER);
    mockUpdate.mockResolvedValue(undefined);

    await cancelOrderItemsForUser("user-1", "order-1", ["product-a"], "changed my mind");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [orderId, patch] = mockUpdate.mock.calls[0];
    expect(orderId).toBe("order-1");
    expect(patch.refundPending).toBe(true);
    const items = patch.items as Array<{ productId: string; cancelledQuantity?: number }>;
    expect(items.find((i) => i.productId === "product-a")?.cancelledQuantity).toBe(1);
    expect(items.find((i) => i.productId === "product-b")?.cancelledQuantity).toBeUndefined();
    // No refund action is fired — matches today's whole-order behavior.
    expect(mockCancelOrder).not.toHaveBeenCalled();
  });

  it("falls through to the whole-order cancel path when every item ends up cancelled", async () => {
    mockFindById.mockResolvedValue(BASE_ORDER);
    mockCancelOrder.mockResolvedValue(undefined);

    await cancelOrderItemsForUser("user-1", "order-1", ["product-a", "product-b"], "all of it");

    expect(mockCancelOrder).toHaveBeenCalledWith("order-1", "all of it");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("delegates to the whole-order cancel path when itemIds is empty", async () => {
    mockFindById.mockResolvedValue(BASE_ORDER);
    mockCancelOrder.mockResolvedValue(undefined);

    await cancelOrderItemsForUser("user-1", "order-1", [], "reason");

    expect(mockCancelOrder).toHaveBeenCalledWith("order-1", "reason");
  });

  it("throws ValidationError when none of the selected productIds belong to the order", async () => {
    mockFindById.mockResolvedValue(BASE_ORDER);
    await expect(
      cancelOrderItemsForUser("user-1", "order-1", ["product-does-not-exist"], "reason"),
    ).rejects.toThrow(ValidationError);
  });
});

describe("cancelOrderForUser (status guard reconciliation)", () => {
  beforeEach(() => {
    mockFindById.mockReset();
    mockCancelOrder.mockReset();
  });

  it("allows cancelling a 'confirmed' order (reconciled ORDER_CANCELLABLE_STATUSES)", async () => {
    mockFindById.mockResolvedValue({ ...BASE_ORDER, status: "confirmed" });
    mockCancelOrder.mockResolvedValue(undefined);
    await expect(cancelOrderForUser("user-1", "order-1", "reason")).resolves.toBeUndefined();
  });

  it("rejects cancelling a 'shipped' order", async () => {
    mockFindById.mockResolvedValue({ ...BASE_ORDER, status: "shipped" });
    await expect(cancelOrderForUser("user-1", "order-1", "reason")).rejects.toThrow(ValidationError);
  });
});
