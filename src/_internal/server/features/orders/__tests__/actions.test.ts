import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockOrderCreate,
  mockOrderFindById,
  mockOrderCancelOrder,
  mockOrderUpdateStatus,
  mockAssertOrderCancellable,
  mockAssertReturnWindowOpen,
  mockIsAdminUser,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockOrderCreate: vi.fn(),
  mockOrderFindById: vi.fn(),
  mockOrderCancelOrder: vi.fn(),
  mockOrderUpdateStatus: vi.fn(),
  mockAssertOrderCancellable: vi.fn(),
  mockAssertReturnWindowOpen: vi.fn(),
  mockIsAdminUser: vi.fn(),
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
  orderRepository: {
    create: mockOrderCreate,
    findById: mockOrderFindById,
    cancelOrder: mockOrderCancelOrder,
    updateStatus: mockOrderUpdateStatus,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertOrderCancellable: mockAssertOrderCancellable,
  assertOrderOwnership: vi.fn(),
  assertReturnWindowOpen: mockAssertReturnWindowOpen,
}));

vi.mock("../../../../features/auth/role-predicates", () => ({
  isAdminUser: mockIsAdminUser,
}));

import {
  cancelOrderAction,
  requestReturnAction,
  updateOrderStatusAction,
} from "../actions";

function makeBuyerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeSellerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "store-seller-1", email: "seller@test.com", name: "Seller One", ...overrides };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1-20260629-abc123",
    buyerId: "user-buyer-1",
    storeId: "store-seller-1",
    status: "pending",
    totalAmount: 500000,
    ...overrides,
  };
}

describe("cancelOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockAssertOrderCancellable.mockResolvedValue(makeOrder());
    mockOrderCancelOrder.mockResolvedValue(makeOrder({ status: "cancelled" }));
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await cancelOrderAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(false);
  });

  it("missing orderId → { ok: false }", async () => {
    const result = await cancelOrderAction({});
    expect(result.ok).toBe(false);
  });

  it("order not cancellable (assertOrderCancellable throws) → { ok: false }", async () => {
    mockAssertOrderCancellable.mockRejectedValue(new Error("Order cannot be cancelled"));
    const result = await cancelOrderAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(false);
  });

  it("order belongs to different user → { ok: false }", async () => {
    mockAssertOrderCancellable.mockRejectedValue(new Error("Forbidden"));
    const result = await cancelOrderAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(false);
  });

  it("valid → orderRepository.cancelOrder called with orderId", async () => {
    await cancelOrderAction({ orderId: "order-1-20260629-abc123" });
    expect(mockOrderCancelOrder).toHaveBeenCalledWith(
      "order-1-20260629-abc123",
      expect.any(String),
    );
  });

  it("reason provided → passed to cancelOrder", async () => {
    await cancelOrderAction({ orderId: "order-1-20260629-abc123", reason: "Changed my mind" });
    expect(mockOrderCancelOrder).toHaveBeenCalledWith(
      "order-1-20260629-abc123",
      "Changed my mind",
    );
  });

  it("no reason provided → defaults to 'Cancelled by user'", async () => {
    await cancelOrderAction({ orderId: "order-1-20260629-abc123" });
    expect(mockOrderCancelOrder).toHaveBeenCalledWith(
      "order-1-20260629-abc123",
      "Cancelled by user",
    );
  });

  it("success → { ok: true }", async () => {
    const result = await cancelOrderAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(true);
  });
});

describe("requestReturnAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockAssertReturnWindowOpen.mockResolvedValue(makeOrder({ status: "delivered" }));
    mockOrderUpdateStatus.mockResolvedValue(makeOrder({ status: "return_requested" }));
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await requestReturnAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(false);
  });

  it("return window expired (assertReturnWindowOpen throws) → { ok: false }", async () => {
    mockAssertReturnWindowOpen.mockRejectedValue(new Error("Return window has expired"));
    const result = await requestReturnAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(false);
  });

  it("order not delivered (assertReturnWindowOpen throws) → { ok: false }", async () => {
    mockAssertReturnWindowOpen.mockRejectedValue(new Error("Order not delivered"));
    const result = await requestReturnAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(false);
  });

  it("valid → orderRepository.updateStatus called with return_requested", async () => {
    await requestReturnAction({ orderId: "order-1-20260629-abc123" });
    expect(mockOrderUpdateStatus).toHaveBeenCalledWith(
      "order-1-20260629-abc123",
      "return_requested",
    );
  });

  it("success → { ok: true }", async () => {
    const result = await requestReturnAction({ orderId: "order-1-20260629-abc123" });
    expect(result.ok).toBe(true);
  });
});

describe("updateOrderStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockIsAdminUser.mockReturnValue(false);
    mockOrderFindById.mockResolvedValue(makeOrder({ storeId: "store-seller-1" }));
    mockOrderUpdateStatus.mockResolvedValue(makeOrder({ status: "shipped" }));
  });

  it("buyer role → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await updateOrderStatusAction({
      orderId: "order-1-20260629-abc123",
      status: "shipped",
    });
    expect(result.ok).toBe(false);
  });

  it("missing orderId → { ok: false }", async () => {
    const result = await updateOrderStatusAction({ status: "shipped" });
    expect(result.ok).toBe(false);
  });

  it("order not found → { ok: false, error: /not found/i }", async () => {
    mockOrderFindById.mockResolvedValue(null);
    const result = await updateOrderStatusAction({
      orderId: "order-missing",
      status: "shipped",
    });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("seller updating order from different store → { ok: false }", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ storeId: "store-other" }));
    const result = await updateOrderStatusAction({
      orderId: "order-1-20260629-abc123",
      status: "shipped",
    });
    expect(result.ok).toBe(false);
  });

  it("admin can update order from any store", async () => {
    mockIsAdminUser.mockReturnValue(true);
    mockOrderFindById.mockResolvedValue(makeOrder({ storeId: "store-other" }));
    mockRequireRoleUser.mockResolvedValue({ uid: "user-admin-1", email: "admin@test.com" });
    await updateOrderStatusAction({
      orderId: "order-1-20260629-abc123",
      status: "shipped",
    });
    expect(mockOrderUpdateStatus).toHaveBeenCalled();
  });

  it("valid → orderRepository.updateStatus called", async () => {
    await updateOrderStatusAction({
      orderId: "order-1-20260629-abc123",
      status: "shipped",
    });
    expect(mockOrderUpdateStatus).toHaveBeenCalledWith(
      "order-1-20260629-abc123",
      "shipped",
      expect.any(Object),
    );
  });

  it("success → { ok: true }", async () => {
    const result = await updateOrderStatusAction({
      orderId: "order-1-20260629-abc123",
      status: "shipped",
    });
    expect(result.ok).toBe(true);
  });
});
