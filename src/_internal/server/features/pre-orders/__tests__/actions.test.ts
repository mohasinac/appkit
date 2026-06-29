import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockProductUpdate,
  mockAssertPreOrderAvailable,
  mockComputeDeposit,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockAssertPreOrderAvailable: vi.fn(),
  mockComputeDeposit: vi.fn(),
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
  productRepository: {
    update: mockProductUpdate,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertPreOrderAvailable: mockAssertPreOrderAvailable,
  computeDeposit: mockComputeDeposit,
}));

import { reservePreOrderAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makePreOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "preorder-dbz-goku-ultra-ego",
    title: "DBZ Goku Ultra Ego Figure",
    listingType: "pre-order",
    preOrderCurrentCount: 5,
    preOrderMaxCount: 100,
    ...overrides,
  };
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    preOrderId: "preorder-dbz-goku-ultra-ego",
    quantity: 1,
    ...overrides,
  };
}

describe("reservePreOrderAction — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockAssertPreOrderAvailable.mockResolvedValue(makePreOrder());
    mockComputeDeposit.mockReturnValue(50000);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("unauthenticated (requireRoleUser throws) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await reservePreOrderAction(makeInput());
    expect(result.ok).toBe(false);
  });
});

describe("reservePreOrderAction — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockAssertPreOrderAvailable.mockResolvedValue(makePreOrder());
    mockComputeDeposit.mockReturnValue(50000);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("input missing preOrderId → { ok: false, error: /invalid/i }", async () => {
    const result = await reservePreOrderAction({ quantity: 1 });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/invalid/i);
  });

  it("quantity < 1 → { ok: false }", async () => {
    const result = await reservePreOrderAction(makeInput({ quantity: 0 }));
    expect(result.ok).toBe(false);
  });

  it("assertPreOrderAvailable throws (pre-order closed) → { ok: false }", async () => {
    mockAssertPreOrderAvailable.mockRejectedValue(new Error("Pre-order is no longer accepting reservations"));
    const result = await reservePreOrderAction(makeInput());
    expect(result.ok).toBe(false);
  });

  it("assertPreOrderAvailable throws (quantity exceeds remaining) → { ok: false }", async () => {
    mockAssertPreOrderAvailable.mockRejectedValue(new Error("Requested quantity exceeds remaining slots"));
    const result = await reservePreOrderAction(makeInput({ quantity: 200 }));
    expect(result.ok).toBe(false);
  });
});

describe("reservePreOrderAction — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockAssertPreOrderAvailable.mockResolvedValue(makePreOrder({ preOrderCurrentCount: 5 }));
    mockComputeDeposit.mockReturnValue(50000);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("valid → productRepository.update called with { preOrderCurrentCount: current + quantity }", async () => {
    await reservePreOrderAction(makeInput({ quantity: 1 }));
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "preorder-dbz-goku-ultra-ego",
      expect.objectContaining({ preOrderCurrentCount: 6 }),
    );
  });

  it("product.preOrderCurrentCount = 5 + quantity 1 → updated to 6", async () => {
    await reservePreOrderAction(makeInput({ quantity: 1 }));
    const updateArg = mockProductUpdate.mock.calls[0][1];
    expect(updateArg.preOrderCurrentCount).toBe(6);
  });

  it("product.preOrderCurrentCount undefined → updated to 0 + quantity = quantity", async () => {
    mockAssertPreOrderAvailable.mockResolvedValue(makePreOrder({ preOrderCurrentCount: undefined }));
    await reservePreOrderAction(makeInput({ quantity: 3 }));
    const updateArg = mockProductUpdate.mock.calls[0][1];
    expect(updateArg.preOrderCurrentCount).toBe(3);
  });

  it("quantity = 2 → preOrderCurrentCount incremented by 2", async () => {
    await reservePreOrderAction(makeInput({ quantity: 2 }));
    const updateArg = mockProductUpdate.mock.calls[0][1];
    expect(updateArg.preOrderCurrentCount).toBe(7);
  });

  it("valid → returns { ok: true, data: { preOrderId, buyerId, quantity, depositAmount, status: 'pending_payment' } }", async () => {
    const result = await reservePreOrderAction(makeInput({ quantity: 1 }));
    expect(result.ok).toBe(true);
    expect((result as { data: Record<string, unknown> }).data).toMatchObject({
      preOrderId: "preorder-dbz-goku-ultra-ego",
      buyerId: "user-buyer-1",
      quantity: 1,
      status: "pending_payment",
    });
  });

  it("depositAmount = computeDeposit(product) * quantity", async () => {
    mockComputeDeposit.mockReturnValue(50000);
    const result = await reservePreOrderAction(makeInput({ quantity: 1 }));
    const data = (result as { data: { depositAmount: number } }).data;
    expect(data.depositAmount).toBe(50000);
  });

  it("quantity = 3 → depositAmount = deposit * 3", async () => {
    mockComputeDeposit.mockReturnValue(50000);
    const result = await reservePreOrderAction(makeInput({ quantity: 3 }));
    const data = (result as { data: { depositAmount: number } }).data;
    expect(data.depositAmount).toBe(150000);
  });
});
