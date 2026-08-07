import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindById,
  mockOrderFindById,
  mockOrderUpdate,
  mockPayoutCreate,
  mockGetSingleton,
} = vi.hoisted(() => ({
  mockUserFindById: vi.fn(),
  mockOrderFindById: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockPayoutCreate: vi.fn(),
  mockGetSingleton: vi.fn(),
}));

vi.mock("../../../auth/repository/user.repository", () => ({
  userRepository: { findById: mockUserFindById },
}));
vi.mock("../../../orders/repository/orders.repository", () => ({
  orderRepository: { findById: mockOrderFindById, update: mockOrderUpdate },
}));
vi.mock("../../../payments/repository/payout.repository", () => ({
  payoutRepository: { create: mockPayoutCreate },
}));
vi.mock("../../../admin/repository/site-settings.repository", () => ({
  siteSettingsRepository: { getSingleton: mockGetSingleton },
}));

// The module under test pulls in a large tree of sibling repositories/errors —
// only the ones above matter for bulkSellerOrder's EMI-skip branch, so the
// rest resolve to their real implementations (the file must still import cleanly).

import { bulkSellerOrder } from "../seller-actions";
import type { OrderDocument } from "../../../orders/schemas/firestore";

function makeOrder(overrides: Partial<OrderDocument> = {}): OrderDocument {
  return {
    id: "order-1",
    storeId: "seller-uid",
    status: "delivered",
    shippingMethod: "custom",
    payoutStatus: "eligible",
    totalPrice: 5000,
    ...overrides,
  } as OrderDocument;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindById.mockResolvedValue({
    payoutDetails: { isConfigured: true, method: "upi", upiId: "seller@upi" },
  });
  mockGetSingleton.mockResolvedValue({
    commissions: { platformFeePercent: 5, gstPercent: 18, gatewayFeePercent: 2 },
  });
  mockPayoutCreate.mockResolvedValue({ id: "payout-1" });
  mockOrderUpdate.mockResolvedValue(undefined);
});

describe("bulkSellerOrder — EMI-incomplete exclusion", () => {
  it("skips a delivered order that is EMI-enabled but not yet fully paid", async () => {
    mockOrderFindById.mockResolvedValue(
      makeOrder({ id: "order-emi", emiEnabled: true, emiComplete: false }),
    );
    await expect(
      bulkSellerOrder("seller-uid", "seller", "Seller", "seller@example.com", ["order-emi"]),
    ).rejects.toThrow(/no eligible orders/i);
    expect(mockPayoutCreate).not.toHaveBeenCalled();
  });

  it("includes a delivered order that is EMI-enabled and fully paid", async () => {
    mockOrderFindById.mockResolvedValue(
      makeOrder({ id: "order-emi-done", emiEnabled: true, emiComplete: true }),
    );
    const result = await bulkSellerOrder("seller-uid", "seller", "Seller", "seller@example.com", ["order-emi-done"]);
    expect(result.requested).toEqual(["order-emi-done"]);
    expect(mockPayoutCreate).toHaveBeenCalled();
  });

  it("mixed batch: EMI-incomplete order is skipped, non-EMI order still pays out", async () => {
    mockOrderFindById.mockImplementation((id: string) =>
      Promise.resolve(
        id === "order-emi"
          ? makeOrder({ id: "order-emi", emiEnabled: true, emiComplete: false })
          : makeOrder({ id: "order-plain" }),
      ),
    );
    const result = await bulkSellerOrder(
      "seller-uid",
      "seller",
      "Seller",
      "seller@example.com",
      ["order-emi", "order-plain"],
    );
    expect(result.requested).toEqual(["order-plain"]);
    expect(result.skipped).toEqual(["order-emi"]);
  });
});
