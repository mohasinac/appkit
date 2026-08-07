import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProductFindById } = vi.hoisted(() => ({
  mockProductFindById: vi.fn(),
}));

vi.mock("../../../products/repository/products.repository", () => ({
  productRepository: { findById: mockProductFindById },
}));

// The module under test pulls in a large tree of sibling repositories/errors —
// only productRepository matters for assertEmiShippable, but the file must
// still import cleanly, so the rest resolve to their real implementations.

import { assertEmiShippable } from "../seller-actions";
import type { OrderDocument } from "../../../orders/schemas/firestore";

function makeOrder(overrides: Partial<OrderDocument> = {}): OrderDocument {
  return {
    id: "order-1",
    storeId: "store-A",
    items: [{ productId: "product-1", productTitle: "Widget", quantity: 1, unitPrice: 100, totalPrice: 100 }],
    ...overrides,
  } as OrderDocument;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertEmiShippable", () => {
  it("non-EMI order → resolves without checking products", async () => {
    await expect(assertEmiShippable(makeOrder({ emiEnabled: false }))).resolves.toBeUndefined();
    expect(mockProductFindById).not.toHaveBeenCalled();
  });

  it("EMI order already complete → resolves without checking products", async () => {
    await expect(
      assertEmiShippable(makeOrder({ emiEnabled: true, emiComplete: true })),
    ).resolves.toBeUndefined();
    expect(mockProductFindById).not.toHaveBeenCalled();
  });

  it("EMI incomplete, every product allows early ship → resolves", async () => {
    mockProductFindById.mockResolvedValue({ allowShipBeforeEmiComplete: true });
    await expect(
      assertEmiShippable(makeOrder({ emiEnabled: true, emiComplete: false })),
    ).resolves.toBeUndefined();
  });

  it("EMI incomplete, product does NOT allow early ship → throws", async () => {
    mockProductFindById.mockResolvedValue({ allowShipBeforeEmiComplete: false });
    await expect(
      assertEmiShippable(makeOrder({ emiEnabled: true, emiComplete: false })),
    ).rejects.toThrow(/EMI plan/i);
  });

  it("EMI incomplete, multi-item order where only ONE item disallows early ship → throws", async () => {
    mockProductFindById
      .mockResolvedValueOnce({ allowShipBeforeEmiComplete: true })
      .mockResolvedValueOnce({ allowShipBeforeEmiComplete: false });
    const order = makeOrder({
      emiEnabled: true,
      emiComplete: false,
      items: [
        { productId: "product-1", productTitle: "A", quantity: 1, unitPrice: 100, totalPrice: 100 },
        { productId: "product-2", productTitle: "B", quantity: 1, unitPrice: 100, totalPrice: 100 },
      ],
    });
    await expect(assertEmiShippable(order)).rejects.toThrow(/EMI plan/i);
  });

  it("EMI incomplete with no items on the order → throws (fail-safe, can't verify)", async () => {
    await expect(
      assertEmiShippable(makeOrder({ emiEnabled: true, emiComplete: false, items: [] })),
    ).rejects.toThrow(/EMI plan/i);
    expect(mockProductFindById).not.toHaveBeenCalled();
  });
});
