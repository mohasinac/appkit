import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockOrderFindById,
  mockOrderUpdate,
  mockIsAdminUser,
  mockIsModeratorUser,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockOrderFindById: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockIsAdminUser: vi.fn(),
  mockIsModeratorUser: vi.fn(),
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

vi.mock("../../../../../repositories", () => ({
  orderRepository: {
    findById: mockOrderFindById,
    update: mockOrderUpdate,
  },
}));

vi.mock("../../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("../../../../../features/auth/role-predicates", () => ({
  isAdminUser: mockIsAdminUser,
  isModeratorUser: mockIsModeratorUser,
}));

import { attachPaymentProofAction, adminVerifyPaymentAction } from "../actions";

function makeBuyerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer", role: "user", ...overrides };
}

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-admin-1", email: "admin@test.com", name: "Admin", role: "admin", ...overrides };
}

function makeCashOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1-20260729-test01",
    userId: "user-buyer-1",
    storeId: "store-test",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "cash",
    totalPrice: 50000,
    ...overrides,
  };
}

describe("attachPaymentProofAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockIsAdminUser.mockReturnValue(false);
    mockIsModeratorUser.mockReturnValue(false);
    mockOrderUpdate.mockResolvedValue(undefined);
  });

  it("throws when order does not exist", async () => {
    mockOrderFindById.mockRejectedValue(new Error("Not found"));
    const result = await attachPaymentProofAction("order-missing", {
      proofUrl: "/media/proof.jpg",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/order-missing/i);
  });

  it("throws OWNERSHIP error when buyer does not own the order", async () => {
    mockOrderFindById.mockResolvedValue(makeCashOrder({ userId: "user-other-buyer" }));
    const result = await attachPaymentProofAction("order-1-20260729-test01", {
      proofUrl: "/media/proof.jpg",
    });
    expect(result.ok).toBe(false);
  });

  it("throws when paymentMethod is not cash or upi_manual", async () => {
    mockOrderFindById.mockResolvedValue(makeCashOrder({ paymentMethod: "online" }));
    const result = await attachPaymentProofAction("order-1-20260729-test01", {
      proofUrl: "/media/proof.jpg",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/cash|upi/i);
  });

  it("throws PROOF_ALREADY_ATTACHED when proof is already set", async () => {
    mockOrderFindById.mockResolvedValue(
      makeCashOrder({ paymentProofUrl: "/media/existing-proof.jpg" }),
    );
    const result = await attachPaymentProofAction("order-1-20260729-test01", {
      proofUrl: "/media/proof.jpg",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PROOF_ALREADY_ATTACHED/);
  });

  it("writes all proof fields on success", async () => {
    mockOrderFindById.mockResolvedValue(makeCashOrder());
    const result = await attachPaymentProofAction("order-1-20260729-test01", {
      proofUrl: "/media/proof.jpg",
      transactionId: "UTR-12345",
      mimeType: "image/jpeg",
    });
    expect(result.ok).toBe(true);
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1-20260729-test01",
      expect.objectContaining({
        paymentProofUrl: "/media/proof.jpg",
        paymentTransactionId: "UTR-12345",
        paymentProofMimeType: "image/jpeg",
        paymentProofUploadedAt: expect.any(Date),
      }),
    );
  });

  it("allows upi_manual payment method", async () => {
    mockOrderFindById.mockResolvedValue(makeCashOrder({ paymentMethod: "upi_manual" }));
    const result = await attachPaymentProofAction("order-1-20260729-test01", {
      proofUrl: "/media/proof.jpg",
    });
    expect(result.ok).toBe(true);
  });

  it("admin can attach proof to any order regardless of ownership", async () => {
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockIsAdminUser.mockReturnValue(true);
    mockOrderFindById.mockResolvedValue(makeCashOrder({ userId: "user-other-buyer" }));
    const result = await attachPaymentProofAction("order-1-20260729-test01", {
      proofUrl: "/media/admin-proof.jpg",
    });
    expect(result.ok).toBe(true);
  });
});

describe("adminVerifyPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockIsAdminUser.mockReturnValue(true);
    mockIsModeratorUser.mockReturnValue(false);
    mockOrderUpdate.mockResolvedValue(undefined);
  });

  it("throws when order does not exist", async () => {
    mockOrderFindById.mockRejectedValue(new Error("Not found"));
    const result = await adminVerifyPaymentAction("order-missing");
    expect(result.ok).toBe(false);
  });

  it("throws when caller is not admin or moderator", async () => {
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockIsAdminUser.mockReturnValue(false);
    mockIsModeratorUser.mockReturnValue(false);
    mockOrderFindById.mockResolvedValue(makeCashOrder());
    const result = await adminVerifyPaymentAction("order-1-20260729-test01");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/admin|moderator/i);
  });

  it("is idempotent: does not call update if already paid", async () => {
    mockOrderFindById.mockResolvedValue(makeCashOrder({ paymentStatus: "paid" }));
    const result = await adminVerifyPaymentAction("order-1-20260729-test01");
    expect(result.ok).toBe(true);
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("sets paymentStatus=paid and status=processing on success", async () => {
    mockOrderFindById.mockResolvedValue(
      makeCashOrder({ paymentTransactionId: "UTR-99999" }),
    );
    const result = await adminVerifyPaymentAction("order-1-20260729-test01");
    expect(result.ok).toBe(true);
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1-20260729-test01",
      expect.objectContaining({
        paymentStatus: "paid",
        status: "processing",
      }),
    );
  });

  it("uses paymentTransactionId as paymentId when available", async () => {
    mockOrderFindById.mockResolvedValue(
      makeCashOrder({ paymentTransactionId: "UTR-CUSTOM-TXN" }),
    );
    await adminVerifyPaymentAction("order-1-20260729-test01");
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1-20260729-test01",
      expect.objectContaining({ paymentId: "UTR-CUSTOM-TXN" }),
    );
  });

  it("falls back to manual-{orderId} as paymentId when no transactionId", async () => {
    mockOrderFindById.mockResolvedValue(makeCashOrder());
    await adminVerifyPaymentAction("order-1-20260729-test01");
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1-20260729-test01",
      expect.objectContaining({ paymentId: "manual-order-1-20260729-test01" }),
    );
  });

  it("moderator can verify payment", async () => {
    mockIsAdminUser.mockReturnValue(false);
    mockIsModeratorUser.mockReturnValue(true);
    mockOrderFindById.mockResolvedValue(makeCashOrder());
    const result = await adminVerifyPaymentAction("order-1-20260729-test01");
    expect(result.ok).toBe(true);
  });
});
