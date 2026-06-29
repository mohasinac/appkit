import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCreateRazorpayOrder,
  mockRupeesToPaise,
  mockVerifyPaymentSignatureWithKeys,
  mockResolvePaymentFee,
  mockGetDefaultCurrency,
} = vi.hoisted(() => ({
  mockCreateRazorpayOrder: vi.fn(),
  mockRupeesToPaise: vi.fn(),
  mockVerifyPaymentSignatureWithKeys: vi.fn(),
  mockResolvePaymentFee: vi.fn(),
  mockGetDefaultCurrency: vi.fn(),
}));

vi.mock("../../../../providers/payment-razorpay/index", () => ({
  createRazorpayOrder: mockCreateRazorpayOrder,
  rupeesToPaise: mockRupeesToPaise,
  verifyPaymentSignatureWithKeys: mockVerifyPaymentSignatureWithKeys,
}));

vi.mock("../../../../core/index", () => ({
  getDefaultCurrency: mockGetDefaultCurrency,
}));

vi.mock("./data", () => ({
  resolvePaymentFee: mockResolvePaymentFee,
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  createPaymentIntentAction,
  verifyPaymentSignatureAction,
} from "../actions";

describe("createPaymentIntentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "rzp_test_key123";
    mockGetDefaultCurrency.mockReturnValue("INR");
    mockResolvePaymentFee.mockResolvedValue({
      baseAmount: 1000,
      platformFee: 20,
      totalAmount: 1020,
    });
    mockRupeesToPaise.mockReturnValue(102000);
    mockCreateRazorpayOrder.mockResolvedValue({
      id: "order_razorpay_abc123",
      amount: 102000,
      currency: "INR",
    });
  });

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
  });

  it("RAZORPAY_KEY_ID not set → throws ApiError 500", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    await expect(
      createPaymentIntentAction({ userId: "user-buyer-1", amount: 1000 }),
    ).rejects.toThrow();
  });

  it("amount <= 0 → resolvePaymentFee called with 0 (no guard in action itself)", async () => {
    await createPaymentIntentAction({ userId: "user-buyer-1", amount: 0 });
    expect(mockResolvePaymentFee).toHaveBeenCalledWith(0);
  });

  it("valid → createRazorpayOrder called with amount in paise + currency INR", async () => {
    await createPaymentIntentAction({ userId: "user-buyer-1", amount: 1000 });
    expect(mockCreateRazorpayOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 102000,
        currency: "INR",
      }),
    );
  });

  it("valid → receipt includes userId", async () => {
    await createPaymentIntentAction({ userId: "user-buyer-1", amount: 1000 });
    const callArg = mockCreateRazorpayOrder.mock.calls[0][0];
    expect(callArg.receipt).toMatch(/user-buyer-1/);
  });

  it("custom receipt provided → used as receipt", async () => {
    await createPaymentIntentAction({
      userId: "user-buyer-1",
      amount: 1000,
      receipt: "custom-receipt-001",
    });
    expect(mockCreateRazorpayOrder).toHaveBeenCalledWith(
      expect.objectContaining({ receipt: "custom-receipt-001" }),
    );
  });

  it("success → returns razorpayOrderId, amount, currency, keyId, platformFee, baseAmount", async () => {
    const result = await createPaymentIntentAction({ userId: "user-buyer-1", amount: 1000 });
    expect(result).toEqual(
      expect.objectContaining({
        razorpayOrderId: "order_razorpay_abc123",
        amount: 102000,
        currency: "INR",
        keyId: "rzp_test_key123",
        platformFee: 20,
        baseAmount: 1000,
      }),
    );
  });
});

describe("verifyPaymentSignatureAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyPaymentSignatureWithKeys.mockReturnValue(true);
  });

  it("valid signature → returns true", async () => {
    const result = await verifyPaymentSignatureAction({
      orderId: "order_razorpay_abc123",
      paymentId: "pay_razorpay_xyz789",
      signature: "valid-hmac-signature",
    });
    expect(result).toBe(true);
  });

  it("invalid signature → returns false", async () => {
    mockVerifyPaymentSignatureWithKeys.mockReturnValue(false);
    const result = await verifyPaymentSignatureAction({
      orderId: "order_razorpay_abc123",
      paymentId: "pay_razorpay_xyz789",
      signature: "invalid-signature",
    });
    expect(result).toBe(false);
  });

  it("verifyPaymentSignatureWithKeys called with orderId and paymentId", async () => {
    await verifyPaymentSignatureAction({
      orderId: "order_razorpay_abc123",
      paymentId: "pay_razorpay_xyz789",
      signature: "sig",
    });
    expect(mockVerifyPaymentSignatureWithKeys).toHaveBeenCalledWith({
      razorpay_order_id: "order_razorpay_abc123",
      razorpay_payment_id: "pay_razorpay_xyz789",
      razorpay_signature: "sig",
    });
  });
});
