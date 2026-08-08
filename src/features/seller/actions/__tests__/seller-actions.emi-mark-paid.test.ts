import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOrderFindById, mockOrderUpdate, mockFindByOwnerId } = vi.hoisted(() => ({
  mockOrderFindById: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockFindByOwnerId: vi.fn(),
}));

vi.mock("../../../orders/repository/orders.repository", () => ({
  orderRepository: { findById: mockOrderFindById, update: mockOrderUpdate },
}));

// order.storeId is the store SLUG, not the seller's Firebase UID — the
// ownership check resolves the caller's store via storeRepository first
// (see seller-actions.ts), so that lookup must be mocked here too.
vi.mock("../../../stores/repository/store.repository", () => ({
  storeRepository: { findByOwnerId: mockFindByOwnerId },
}));

// The module under test pulls in a large tree of sibling repositories/errors —
// only orderRepository/storeRepository matter for markEmiInstallmentPaid, so
// the rest resolve to their real implementations (the file must still import
// cleanly).

import { markEmiInstallmentPaid } from "../seller-actions";
import type { OrderDocument, EmiInstallment } from "../../../orders/schemas/firestore";

const SELLER_UID = "seller-uid-A";

function makeInstallments(overrides: Partial<EmiInstallment>[] = []): EmiInstallment[] {
  const base: EmiInstallment[] = [
    { index: 1, dueDate: new Date("2026-06-05"), amount: 1000, status: "pending" },
    { index: 2, dueDate: new Date("2026-07-05"), amount: 1000, status: "pending" },
    { index: 3, dueDate: new Date("2026-08-05"), amount: 1000, status: "pending" },
  ];
  overrides.forEach((o, i) => Object.assign(base[i], o));
  return base;
}

function makeOrder(overrides: Partial<OrderDocument> = {}): OrderDocument {
  return {
    id: "order-1",
    storeId: "store-A",
    emiEnabled: true,
    emiInstallments: makeInstallments(),
    ...overrides,
  } as OrderDocument;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderUpdate.mockImplementation((id: string, data: Partial<OrderDocument>) => ({ id, ...data }));
  // SELLER_UID owns "store-A" by default; individual tests override for the
  // non-owning case.
  mockFindByOwnerId.mockResolvedValue({ id: "store-A" });
});

describe("markEmiInstallmentPaid", () => {
  it("order not found → throws", async () => {
    mockOrderFindById.mockResolvedValue(null);
    await expect(
      markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", { installmentIndex: 1 }),
    ).rejects.toThrow(/not found/i);
  });

  it("non-admin, non-owning seller → throws AuthorizationError", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ storeId: "store-B" }));
    await expect(
      markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", { installmentIndex: 1 }),
    ).rejects.toThrow();
  });

  it("admin can mark installment paid on any store's order", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ storeId: "store-B" }));
    await expect(
      markEmiInstallmentPaid("admin-uid", "admin", "order-1", { installmentIndex: 1 }),
    ).resolves.toBeDefined();
    // Admin bypasses ownership resolution entirely.
    expect(mockFindByOwnerId).not.toHaveBeenCalled();
  });

  it("order not on an EMI plan → throws", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder({ emiEnabled: false }));
    await expect(
      markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", { installmentIndex: 1 }),
    ).rejects.toThrow(/EMI plan/i);
  });

  it("installment index not found → throws", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder());
    await expect(
      markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", { installmentIndex: 99 }),
    ).rejects.toThrow(/not found/i);
  });

  it("installment already paid → throws", async () => {
    mockOrderFindById.mockResolvedValue(
      makeOrder({ emiInstallments: makeInstallments([{ status: "paid" }]) }),
    );
    await expect(
      markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", { installmentIndex: 1 }),
    ).rejects.toThrow(/already marked paid/i);
  });

  it("marks the target installment paid, recomputes remaining balance, emiComplete stays false when others pending", async () => {
    mockOrderFindById.mockResolvedValue(makeOrder());
    await markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", {
      installmentIndex: 1,
      transactionId: "UTR123",
      proofUrl: "media/proof-1",
    });

    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        emiRemainingBalance: 2000,
        emiComplete: false,
        emiInstallments: expect.arrayContaining([
          expect.objectContaining({
            index: 1,
            status: "paid",
            transactionId: "UTR123",
            proofUrl: "media/proof-1",
            paidAt: expect.any(Date),
          }),
        ]),
      }),
    );
  });

  it("marking the last pending installment paid → emiComplete becomes true, remaining balance 0", async () => {
    mockOrderFindById.mockResolvedValue(
      makeOrder({
        emiInstallments: makeInstallments([{ status: "paid" }, { status: "paid" }]),
      }),
    );
    await markEmiInstallmentPaid(SELLER_UID, "seller", "order-1", { installmentIndex: 3 });

    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ emiRemainingBalance: 0, emiComplete: true }),
    );
  });
});
