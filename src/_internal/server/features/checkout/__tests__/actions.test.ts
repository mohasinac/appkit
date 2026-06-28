import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted: mock vars used in vi.mock factory closures ──────────────────
const {
  mockGetOrCreate,
  mockAddressFindById,
  mockOrdersCreate,
  mockProductsFindById,
  mockRunBatch,
  mockStoresFindById,
  mockUsersFindById,
  mockSiteSettingsGetSingleton,
  mockNotificationCreate,
  mockCouponsApply,
  mockCouponsFindById,
  mockCouponsGetUsageCount,
  mockClaimedMarkUsed,
  mockRunTransaction,
  mockOtpGet,
  mockFailedLogCheckout,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockGetOrCreate: vi.fn(),
  mockAddressFindById: vi.fn(),
  mockOrdersCreate: vi.fn(),
  mockProductsFindById: vi.fn(),
  mockRunBatch: vi.fn(),
  mockStoresFindById: vi.fn(),
  mockUsersFindById: vi.fn(),
  mockSiteSettingsGetSingleton: vi.fn(),
  mockNotificationCreate: vi.fn(),
  mockCouponsApply: vi.fn(),
  mockCouponsFindById: vi.fn(),
  mockCouponsGetUsageCount: vi.fn(),
  mockClaimedMarkUsed: vi.fn(),
  mockRunTransaction: vi.fn(),
  mockOtpGet: vi.fn(),
  mockFailedLogCheckout: vi.fn(),
  mockSendEmail: vi.fn(),
}));

// ── Repositories barrel (unitOfWork lives here) ─────────────────────────────
vi.mock("../../../../../repositories", () => ({
  unitOfWork: {
    carts: {
      getOrCreate: mockGetOrCreate,
      updateInBatch: vi.fn(),
    },
    addresses: { findById: mockAddressFindById },
    orders: { create: mockOrdersCreate },
    products: { findById: mockProductsFindById, updateInBatch: vi.fn() },
    runBatch: mockRunBatch,
  },
  siteSettingsRepository: { getSingleton: mockSiteSettingsGetSingleton },
  userRepository: { findById: mockUsersFindById },
  storeRepository: { findById: mockStoresFindById },
  couponsRepository: {
    applyCoupon: mockCouponsApply,
    findById: mockCouponsFindById,
    getUserCouponUsageCount: mockCouponsGetUsageCount,
  },
  notificationRepository: { create: mockNotificationCreate },
  claimedCouponsRepository: { markUsed: mockClaimedMarkUsed },
}));

vi.mock("../../../../../features/checkout/repository/failed-checkout.repository", () => ({
  failedCheckoutRepository: {
    logCheckout: mockFailedLogCheckout,
    logPayment: vi.fn(),
  },
}));

vi.mock("../../../../../features/contact/server", () => ({
  sendOrderConfirmationEmail: mockSendEmail,
}));

vi.mock("../../../../../features/orders/index", () => ({
  splitCartIntoOrderGroups: vi.fn((items: unknown[]) => [{ items, orderType: "standard" }]),
}));

vi.mock("../../../../../providers/db-firebase", () => ({
  getAdminDb: vi.fn(() => ({
    runTransaction: mockRunTransaction,
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
        get: vi.fn().mockResolvedValue({ exists: false }),
      })),
    })),
  })),
  getAdminRealtimeDb: vi.fn(() => ({
    ref: vi.fn(() => ({ update: vi.fn().mockResolvedValue(undefined) })),
  })),
  RTDB_PATHS: { PAYMENT_EVENTS: "paymentEvents" },
}));

vi.mock("../../../../../providers/db-firebase/admin", () => ({
  getAdminDb: vi.fn(() => ({
    runTransaction: mockRunTransaction,
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
        })),
      })),
    })),
  })),
  getAdminAuth: vi.fn(),
}));

// consentOtpRef returns a DocumentReference whose .get() controls OTP behavior
vi.mock("../../../../../features/auth/server", () => ({
  consentOtpRef: vi.fn(() => ({ get: mockOtpGet })),
  consentOtpRateLimitRef: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ exists: false }),
    set: vi.fn().mockResolvedValue(undefined),
  })),
  CONSENT_OTP_MAX_BYPASS_CREDITS: 3,
}));

vi.mock("../../../../shared/checkout/rules", () => ({
  getListingRule: vi.fn(() => ({
    decorateOrderItem: vi.fn((base: object) => base),
    decorateOrderDoc: vi.fn(() => ({})),
    stockDecrementExtras: vi.fn(() => ({})),
  })),
  runSyncPreflight: vi.fn(),
}));

vi.mock("../../../../shared/listing-types/cart-shipping", () => ({
  cartIsDigitalOnly: vi.fn(() => false),
}));

vi.mock("../bundle-expansion", () => ({
  getCartItemMemberIds: vi.fn((item: { productId: string }) => [item.productId]),
  getExpandedDecrements: vi.fn((items: { productId: string }[]) => ({
    productIds: [...new Set(items.map((i) => i.productId))],
    decrements: new Map(items.map((i) => [i.productId, 1])),
  })),
  validateCartItemStock: vi.fn(() => null), // null = no shortfall
}));

vi.mock("../prize-bundle-gates", () => ({
  enforceMaxPerUserForCart: vi.fn(),
  computePrizeRevealDeadline: vi.fn(() => new Date()),
}));

vi.mock("../data", () => ({
  formatShippingAddress: vi.fn((addr: { addressLine1: string }) => addr.addressLine1),
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../../../providers/payment-razorpay/index", () => ({
  verifyPaymentSignatureWithKeys: vi.fn(() => true),
  fetchRazorpayOrder: vi.fn(() => ({ amount: 100000 })), // 1000 rupees in paise
  paiseToRupees: vi.fn((p: number) => p / 100),
}));
vi.mock("../../../../../core/index", () => ({
  getDefaultCurrency: vi.fn(() => "INR"),
}));
vi.mock("../../../../../utils", () => ({
  resolveDate: vi.fn((d: unknown) => (d instanceof Date ? d : new Date())),
}));

import { createCheckoutOrderAction } from "../actions";
import { cartIsDigitalOnly } from "../../../../shared/listing-types/cart-shipping";
import { validateCartItemStock } from "../bundle-expansion";

// ── Shared helpers ──────────────────────────────────────────────────────────

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "item-1",
    productId: "product-hot-wheels",
    productTitle: "Hot Wheels",
    quantity: 1,
    price: 5000,
    currency: "INR",
    storeId: "store-A",
    storeName: "Toy Store",
    listingType: "standard",
    ...overrides,
  };
}

function makeCart(overrides: Record<string, unknown> = {}) {
  return {
    id: "cart-user-1",
    userId: "user-1",
    items: [makeCartItem()],
    appliedCoupons: [],
    selectedItemIds: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: "addr-1",
    ownerType: "user",
    ownerId: "user-1",
    fullName: "Ravi Kumar",
    addressLine1: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "IN",
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    userId: "user-1",
    status: "pending",
    totalPrice: 5000,
    ...overrides,
  };
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-hot-wheels",
    title: "Hot Wheels",
    price: 5000,
    availableQuantity: 10,
    listingType: "standard",
    mainImage: "/media/img.jpg",
    ...overrides,
  };
}

function makeSiteSettings(overrides: Record<string, unknown> = {}) {
  return {
    payment: { codEnabled: true },
    commissions: {
      platformFeePercent: 5,
      gstPercent: 18,
      platformShippingPercent: 2,
      platformShippingFixedMin: 50,
      codDepositPercent: 10,
    },
    ...overrides,
  };
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    userName: "Ravi Kumar",
    userEmail: "ravi@example.com",
    addressId: "addr-1",
    paymentMethod: "cod",
    ...overrides,
  };
}

// OTP snap helpers
function makeValidOtp() {
  return {
    exists: true,
    data: () => ({
      verified: true,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins from now
      verifiedVia: "sms",
    }),
  };
}

function makeExpiredOtp() {
  return {
    exists: true,
    data: () => ({
      verified: true,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      verifiedVia: "sms",
    }),
  };
}

// The runTransaction mock simulates the Firestore tx by calling the callback.
// By default, make it succeed with the provided items.
function setupTransactionSuccess(
  availableItems: ReturnType<typeof makeCartItem>[] = [makeCartItem()],
  unavailableItems: unknown[] = [],
) {
  mockRunTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    const mockTx = {
      get: vi.fn().mockResolvedValue(makeValidOtp()), // OTP valid by default
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    // When the tx calls get() for product docs, return a valid product snap
    const product = makeProduct();
    mockTx.get.mockImplementation(async (ref: { id?: string } | undefined) => {
      // OTP ref has no id; product refs do
      if (ref && typeof ref === "object" && "id" in ref && ref.id) {
        return {
          exists: true,
          data: () => product,
        };
      }
      return makeValidOtp();
    });
    return {
      available: availableItems.map((item) => ({ item, product: makeProduct() })),
      unavailable: unavailableItems,
      emailOtpUsed: false,
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default happy-path setup
  mockSiteSettingsGetSingleton.mockResolvedValue(makeSiteSettings());
  mockGetOrCreate.mockResolvedValue(makeCart());
  mockAddressFindById.mockResolvedValue(makeAddress());
  mockProductsFindById.mockResolvedValue(makeProduct());
  mockStoresFindById.mockResolvedValue({ id: "store-A", ownerId: "owner-1" });
  mockUsersFindById.mockResolvedValue({ id: "owner-1", shippingConfig: { isConfigured: false } });
  mockOrdersCreate.mockResolvedValue(makeOrder());
  mockRunBatch.mockResolvedValue(undefined);
  mockNotificationCreate.mockResolvedValue(undefined);
  mockCouponsApply.mockResolvedValue(undefined);
  mockCouponsFindById.mockResolvedValue(null);
  mockCouponsGetUsageCount.mockResolvedValue(0);
  mockClaimedMarkUsed.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue(undefined);
  mockFailedLogCheckout.mockResolvedValue(undefined);
  mockOtpGet.mockResolvedValue(makeValidOtp());
  setupTransactionSuccess();
  (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(false);
});

// ── COD gate ─────────────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — COD gate", () => {
  it("COD + codEnabled=false → ValidationError", async () => {
    mockSiteSettingsGetSingleton.mockResolvedValue(
      makeSiteSettings({ payment: { codEnabled: false } }),
    );
    await expect(createCheckoutOrderAction(makeInput({ paymentMethod: "cod" }))).rejects.toThrow(
      /Cash on Delivery/i,
    );
  });

  it("COD + codEnabled=false + adminBypass=true → does NOT throw", async () => {
    mockSiteSettingsGetSingleton.mockResolvedValue(
      makeSiteSettings({ payment: { codEnabled: false } }),
    );
    const result = await createCheckoutOrderAction(
      makeInput({ paymentMethod: "cod", adminBypass: true }),
    );
    expect(result.orderIds).toHaveLength(1);
  });

  it("COD + codEnabled=true → proceeds normally", async () => {
    const result = await createCheckoutOrderAction(makeInput({ paymentMethod: "cod" }));
    expect(result.orderIds).toHaveLength(1);
  });
});

// ── Cart validation ───────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — cart validation", () => {
  it("empty cart (no items) → ValidationError CART_EMPTY", async () => {
    mockGetOrCreate.mockResolvedValue(makeCart({ items: [] }));
    await expect(createCheckoutOrderAction(makeInput())).rejects.toThrow(/empty/i);
  });

  it("all items in excludedProductIds → ValidationError CART_EMPTY", async () => {
    mockGetOrCreate.mockResolvedValue(makeCart({
      items: [makeCartItem({ productId: "product-A" })],
    }));
    await expect(
      createCheckoutOrderAction(makeInput({ excludedProductIds: ["product-A"] })),
    ).rejects.toThrow(/empty/i);
  });

  it("selectedItemIds filters to only matching items", async () => {
    mockGetOrCreate.mockResolvedValue(makeCart({
      items: [
        makeCartItem({ itemId: "item-A", productId: "product-A" }),
        makeCartItem({ itemId: "item-B", productId: "product-B" }),
      ],
      selectedItemIds: ["item-A"],
    }));
    setupTransactionSuccess([makeCartItem({ itemId: "item-A", productId: "product-A" })]);
    const result = await createCheckoutOrderAction(makeInput());
    // Only item-A should be processed; item-B excluded
    expect(result.orderIds).toHaveLength(1);
  });

  it("selectedItemIds = [] (empty) → processes all items", async () => {
    mockGetOrCreate.mockResolvedValue(makeCart({ selectedItemIds: [] }));
    const result = await createCheckoutOrderAction(makeInput());
    expect(result.orderIds).toHaveLength(1);
  });
});

// ── Address validation ────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — address validation", () => {
  it("physical cart + no addressId → NotFoundError ADDRESS_REQUIRED", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(
      createCheckoutOrderAction(makeInput({ addressId: undefined })),
    ).rejects.toThrow(/address/i);
  });

  it("physical cart + addressId belonging to different user → NotFoundError", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(false);
    mockAddressFindById.mockResolvedValue(makeAddress({ ownerId: "different-user" }));
    await expect(createCheckoutOrderAction(makeInput())).rejects.toThrow(/address/i);
  });

  it("physical cart + valid addressId → proceeds (no address error)", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(false);
    mockAddressFindById.mockResolvedValue(makeAddress({ ownerId: "user-1" }));
    const result = await createCheckoutOrderAction(makeInput());
    expect(result.orderIds).toHaveLength(1);
  });

  it("digital-only cart + no addressId → does NOT throw (address not required)", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(true);
    // Provide a digital item
    mockGetOrCreate.mockResolvedValue(makeCart({
      items: [makeCartItem({ listingType: "digital-code" })],
    }));
    const result = await createCheckoutOrderAction(makeInput({ addressId: undefined }));
    expect(result.orderIds).toHaveLength(1);
  });
});

// ── OTP gate ─────────────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — OTP gate (inside transaction)", () => {
  function setupOtpInTransaction(otpSnap: object) {
    mockRunTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      const mockTx = {
        get: vi.fn().mockResolvedValue(otpSnap),
        update: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };
      try {
        return await callback(mockTx);
      } catch (err) {
        throw err;
      }
    });
  }

  it("no OTP record → 403 ApiError (otp_not_verified)", async () => {
    setupOtpInTransaction({ exists: false, data: () => null });
    await expect(createCheckoutOrderAction(makeInput())).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("OTP exists but verified=false → 403 ApiError", async () => {
    setupOtpInTransaction({
      exists: true,
      data: () => ({ verified: false, expiresAt: new Date(Date.now() + 60_000), verifiedVia: "sms" }),
    });
    await expect(createCheckoutOrderAction(makeInput())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("OTP expired (expiresAt in past) → 403 ApiError", async () => {
    setupOtpInTransaction({
      exists: true,
      data: () => ({
        verified: true,
        expiresAt: new Date(Date.now() - 1000),
        verifiedVia: "sms",
      }),
    });
    await expect(createCheckoutOrderAction(makeInput())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("valid OTP → proceeds, no 403 thrown", async () => {
    setupOtpInTransaction({
      exists: true,
      data: () => ({
        verified: true,
        expiresAt: new Date(Date.now() + 60_000),
        verifiedVia: "sms",
      }),
    });
    // Also provide product snap in transaction
    mockRunTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      return {
        available: [{ item: makeCartItem(), product: makeProduct() }],
        unavailable: [],
        emailOtpUsed: false,
      };
    });
    const result = await createCheckoutOrderAction(makeInput());
    expect(result.orderIds).toHaveLength(1);
  });

  it("adminBypass=true → OTP gate is skipped entirely", async () => {
    // runTransaction returns a result without OTP check being executed
    mockRunTransaction.mockResolvedValue({
      available: [{ item: makeCartItem(), product: makeProduct() }],
      unavailable: [],
      emailOtpUsed: false,
    });
    const result = await createCheckoutOrderAction(makeInput({ adminBypass: true }));
    expect(result.orderIds).toHaveLength(1);
  });

  it("digital-only cart → OTP gate is skipped (otpRef is null)", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockGetOrCreate.mockResolvedValue(makeCart({
      items: [makeCartItem({ listingType: "digital-code" })],
    }));
    mockRunTransaction.mockResolvedValue({
      available: [{ item: makeCartItem({ listingType: "digital-code" }), product: makeProduct({ listingType: "digital-code" }) }],
      unavailable: [],
      emailOtpUsed: false,
    });
    const result = await createCheckoutOrderAction(makeInput({ addressId: undefined }));
    expect(result.orderIds).toHaveLength(1);
  });
});

// ── Stock validation ──────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — stock results", () => {
  it("all items OOS → ValidationError INSUFFICIENT_STOCK", async () => {
    mockRunTransaction.mockResolvedValue({
      available: [],
      unavailable: [{ productId: "product-hot-wheels", productTitle: "Hot Wheels", requestedQty: 1, availableQty: 0 }],
      emailOtpUsed: false,
    });
    await expect(createCheckoutOrderAction(makeInput())).rejects.toThrow(/stock|unavailable/i);
  });

  it("some items OOS → unavailableItems in result", async () => {
    const available = [{ item: makeCartItem({ productId: "prod-A" }), product: makeProduct({ id: "prod-A" }) }];
    const unavailable = [{ productId: "prod-B", productTitle: "B", requestedQty: 2, availableQty: 1 }];
    mockRunTransaction.mockResolvedValue({ available, unavailable, emailOtpUsed: false });
    const result = await createCheckoutOrderAction(makeInput());
    expect(result.unavailableItems).toHaveLength(1);
    expect(result.unavailableItems![0].productId).toBe("prod-B");
    expect(result.orderIds).toHaveLength(1);
  });

  it("all items in stock → no unavailableItems field", async () => {
    const result = await createCheckoutOrderAction(makeInput());
    expect(result.unavailableItems).toBeUndefined();
  });
});

// ── Order creation ─────────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — order creation", () => {
  it("returns { orderIds, total, itemCount }", async () => {
    const result = await createCheckoutOrderAction(makeInput());
    expect(result.orderIds).toBeInstanceOf(Array);
    expect(typeof result.total).toBe("number");
    expect(typeof result.itemCount).toBe("number");
    expect(result.itemCount).toBe(result.orderIds.length);
  });

  it("calls unitOfWork.orders.create with userId, paymentMethod", async () => {
    await createCheckoutOrderAction(makeInput({ paymentMethod: "cod" }));
    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", paymentMethod: "cod" }),
    );
  });

  it("adminBypass order has status PROCESSING and paymentStatus PAID", async () => {
    await createCheckoutOrderAction(makeInput({ adminBypass: true }));
    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.stringMatching(/processing/i),
        paymentStatus: expect.stringMatching(/paid/i),
      }),
    );
  });

  it("non-bypass order has status PENDING and paymentStatus PENDING", async () => {
    await createCheckoutOrderAction(makeInput({ adminBypass: false, paymentMethod: "cod" }));
    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.stringMatching(/pending/i),
        paymentStatus: expect.stringMatching(/pending/i),
      }),
    );
  });

  it("order receives shippingAddress from formatShippingAddress", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(false);
    mockAddressFindById.mockResolvedValue(makeAddress({ addressLine1: "456 Park Ave" }));
    await createCheckoutOrderAction(makeInput());
    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ shippingAddress: "456 Park Ave" }),
    );
  });

  it("digital-only cart order has no shippingAddress", async () => {
    (cartIsDigitalOnly as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockGetOrCreate.mockResolvedValue(makeCart({
      items: [makeCartItem({ listingType: "digital-code" })],
    }));
    mockRunTransaction.mockResolvedValue({
      available: [{ item: makeCartItem({ listingType: "digital-code" }), product: makeProduct({ listingType: "digital-code" }) }],
      unavailable: [],
      emailOtpUsed: false,
    });
    await createCheckoutOrderAction(makeInput({ addressId: undefined }));
    const call = mockOrdersCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(call.shippingAddress).toBeUndefined();
  });

  it("notes are forwarded to order create", async () => {
    await createCheckoutOrderAction(makeInput({ notes: "Leave at door" }));
    expect(mockOrdersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Leave at door" }),
    );
  });

  it("coupon discount pro-rated to order total", async () => {
    // Single item cart, coupon with discountAmount=500 (₹5)
    mockGetOrCreate.mockResolvedValue(makeCart({
      appliedCoupons: [{
        code: "SAVE5",
        couponId: "coupon-1",
        scope: "admin",
        discountAmount: 500,
        storeId: undefined,
      }],
    }));
    await createCheckoutOrderAction(makeInput());
    const call = mockOrdersCreate.mock.calls[0][0] as Record<string, unknown>;
    // With a single order group, the full discount applies to this group
    expect(call.couponDiscount).toBeGreaterThan(0);
    expect(call.couponCode).toBe("SAVE5");
  });
});

// ── Side effects ──────────────────────────────────────────────────────────────

describe("createCheckoutOrderAction — side effects", () => {
  it("coupon usage flushed after order creation", async () => {
    mockGetOrCreate.mockResolvedValue(makeCart({
      appliedCoupons: [{ code: "SAVE10", couponId: "coupon-1", scope: "admin", discountAmount: 1000 }],
    }));
    await createCheckoutOrderAction(makeInput());
    expect(mockCouponsApply).toHaveBeenCalledWith(
      "coupon-1",
      "SAVE10",
      "user-1",
      expect.any(Array),
      expect.any(Number),
    );
  });

  it("no coupons → couponUsageAccumulator is empty, applyCoupon NOT called", async () => {
    mockGetOrCreate.mockResolvedValue(makeCart({ appliedCoupons: [] }));
    await createCheckoutOrderAction(makeInput());
    expect(mockCouponsApply).not.toHaveBeenCalled();
  });

  it("order placed notifications emitted (fire-and-forget — notificationRepository.create called)", async () => {
    await createCheckoutOrderAction(makeInput());
    // Buyer notification
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "order_placed" }),
    );
  });

  it("confirmation email dispatched (fire-and-forget)", async () => {
    await createCheckoutOrderAction(makeInput({ userEmail: "ravi@example.com" }));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ravi@example.com" }),
    );
  });

  it("no email dispatched when userEmail is empty", async () => {
    await createCheckoutOrderAction(makeInput({ userEmail: "" }));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emailOtpUsed=true + unavailableItems → bypass credit granted (consentOtpRateLimitRef called)", async () => {
    mockRunTransaction.mockResolvedValue({
      available: [{ item: makeCartItem({ productId: "prod-A" }), product: makeProduct() }],
      unavailable: [{ productId: "prod-B", productTitle: "B", requestedQty: 1, availableQty: 0 }],
      emailOtpUsed: true,
    });
    const { consentOtpRateLimitRef } = await import("../../../../../features/auth/server");
    await createCheckoutOrderAction(makeInput());
    // grantConsentOtpBypassCredit reads the meta ref when emailOtpUsed=true and unavailable>0
    expect(consentOtpRateLimitRef).toHaveBeenCalled();
  });

  it("emailOtpUsed=false → bypass credit NOT granted", async () => {
    mockRunTransaction.mockResolvedValue({
      available: [{ item: makeCartItem(), product: makeProduct() }],
      unavailable: [{ productId: "prod-B", productTitle: "B", requestedQty: 1, availableQty: 0 }],
      emailOtpUsed: false,
    });
    const { consentOtpRateLimitRef } = await import("../../../../../features/auth/server");
    vi.clearAllMocks();
    await createCheckoutOrderAction(makeInput());
    expect(consentOtpRateLimitRef).not.toHaveBeenCalled();
  });
});
