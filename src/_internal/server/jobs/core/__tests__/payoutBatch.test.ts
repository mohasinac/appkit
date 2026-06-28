import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetPending,
  mockMarkProcessing,
  mockRecordSuccess,
  mockRecordFailure,
  mockFetch,
} = vi.hoisted(() => ({
  mockGetPending: vi.fn(),
  mockMarkProcessing: vi.fn(),
  mockRecordSuccess: vi.fn(),
  mockRecordFailure: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  payoutRepository: {
    getPending: mockGetPending,
    markProcessing: mockMarkProcessing,
    recordSuccess: mockRecordSuccess,
    recordFailure: mockRecordFailure,
  },
}));

vi.mock("../../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { runPayoutBatch } from "../payoutBatch";
import type { JobContext } from "../../runtime/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<{ env: (key: string) => string | undefined }> = {}) {
  return {
    env: (key: string) => {
      const defaults: Record<string, string> = {
        RAZORPAY_KEY_ID: "rzp_test_key",
        RAZORPAY_KEY_SECRET: "secret",
        RAZORPAY_ACCOUNT_NUMBER: "ACC123",
        RAZORPAY_API_BASE_URL: "https://api.razorpay.com/v1",
        APP_BRAND_NAME: "TestBrand",
      };
      return defaults[key];
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    ...overrides,
  } as unknown as JobContext;
}

function makeRef() {
  return { id: "payout-ref-1" } as unknown as FirebaseFirestore.DocumentReference;
}

function makePayout(overrides = {}) {
  return {
    id: "payout-store-A-001",
    storeId: "store-A",
    sellerEmail: "seller@example.com",
    amount: 1000,
    netAmount: 1000,
    currency: "INR",
    paymentMethod: "upi" as const,
    upiId: "seller@upi",
    failureCount: 0,
    ...overrides,
  };
}

function makeBankPayout(overrides = {}) {
  return makePayout({
    paymentMethod: "bank" as const,
    upiId: undefined,
    bankAccount: {
      accountHolderName: "Seller A",
      ifscCode: "HDFC0000001",
      accountNumberMasked: "xxxx1234",
    },
    ...overrides,
  });
}

function makeEntry(payoutOverrides = {}) {
  return {
    ref: makeRef(),
    data: makePayout(payoutOverrides),
  };
}

function mockRazorpaySuccess(id = "rzp_payout_1", status = "processing") {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ id, status }),
    text: async () => JSON.stringify({ id, status }),
  });
}

function mockRazorpayFailure(statusCode = 500, body = "Internal Server Error") {
  mockFetch.mockResolvedValue({
    ok: false,
    status: statusCode,
    text: async () => body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  mockMarkProcessing.mockResolvedValue(undefined);
  mockRecordSuccess.mockResolvedValue(undefined);
  mockRecordFailure.mockResolvedValue(undefined);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runPayoutBatch — no pending payouts", () => {
  it("returns early without calling fetch when list is empty", async () => {
    mockGetPending.mockResolvedValue([]);
    await runPayoutBatch(makeCtx());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs 'No pending payouts' when list is empty", async () => {
    mockGetPending.mockResolvedValue([]);
    const ctx = makeCtx();
    await runPayoutBatch(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/No pending payouts/i));
  });
});

describe("runPayoutBatch — UPI payout", () => {
  it("marks payout as PROCESSING before dispatching", async () => {
    const entry = makeEntry();
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    expect(mockMarkProcessing).toHaveBeenCalledWith(entry.ref);
  });

  it("builds correct UPI payload (account_type=vpa)", async () => {
    const entry = makeEntry({ upiId: "seller@okaxis" });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.fund_account.account_type).toBe("vpa");
    expect(body.fund_account.vpa.address).toBe("seller@okaxis");
    expect(body.mode).toBe("UPI");
  });

  it("converts amount to paise (multiplies by 100)", async () => {
    const entry = makeEntry({ amount: 500, netAmount: 500 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.amount).toBe(50000);
  });

  it("uses netAmount over gross amount when set (after refund deduction)", async () => {
    const entry = makeEntry({ amount: 1000, netAmount: 800 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.amount).toBe(80000); // netAmount 800 * 100
  });

  it("sends Authorization: Basic header with base64-encoded credentials", async () => {
    const entry = makeEntry();
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    const expected = "Basic " + Buffer.from("rzp_test_key:secret").toString("base64");
    expect(headers["Authorization"]).toBe(expected);
  });

  it("sets X-Payout-Idempotency header to payout.id", async () => {
    const entry = makeEntry({ id: "payout-001" });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-Payout-Idempotency"]).toBe("payout-001");
  });

  it("calls recordSuccess with razorpayId and status on success", async () => {
    const entry = makeEntry();
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess("rzp_pout_xyz", "processing");

    await runPayoutBatch(makeCtx());
    expect(mockRecordSuccess).toHaveBeenCalledWith(entry.ref, "rzp_pout_xyz", "processing");
  });

  it("uses reference_id = payout.id in the request body", async () => {
    const entry = makeEntry({ id: "payout-store-B-42" });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.reference_id).toBe("payout-store-B-42");
  });
});

describe("runPayoutBatch — bank payout", () => {
  it("builds correct bank payload (account_type=bank_account)", async () => {
    const entry = { ref: makeRef(), data: makeBankPayout() };
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.fund_account.account_type).toBe("bank_account");
    expect(body.fund_account.bank_account.ifsc).toBe("HDFC0000001");
    expect(body.mode).toBe("NEFT");
  });

  it("bank payout: account_number_masked used in payload", async () => {
    const entry = { ref: makeRef(), data: makeBankPayout() };
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.fund_account.bank_account.account_number).toBe("xxxx1234");
  });
});

describe("runPayoutBatch — no fund account configured", () => {
  it("throws and calls recordFailure when paymentMethod is upi but no upiId", async () => {
    const entry = makeEntry({ paymentMethod: "upi", upiId: undefined });
    mockGetPending.mockResolvedValue([entry]);

    await runPayoutBatch(makeCtx());
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRecordFailure).toHaveBeenCalled();
  });
});

describe("runPayoutBatch — missing Razorpay credentials", () => {
  it("records failure when RAZORPAY_KEY_ID is missing", async () => {
    const entry = makeEntry();
    mockGetPending.mockResolvedValue([entry]);

    const ctx = makeCtx({ env: (k) => (k === "RAZORPAY_KEY_ID" ? undefined : "value") });
    await runPayoutBatch(ctx);
    expect(mockRecordFailure).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("records failure when RAZORPAY_KEY_SECRET is missing", async () => {
    const entry = makeEntry();
    mockGetPending.mockResolvedValue([entry]);

    const ctx = makeCtx({ env: (k) => (k === "RAZORPAY_KEY_SECRET" ? undefined : "value") });
    await runPayoutBatch(ctx);
    expect(mockRecordFailure).toHaveBeenCalled();
  });
});

describe("runPayoutBatch — Razorpay API failure", () => {
  it("Razorpay returns non-OK → calls recordFailure with incremented failureCount", async () => {
    const entry = makeEntry({ failureCount: 0 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpayFailure(500);

    await runPayoutBatch(makeCtx());
    expect(mockRecordFailure).toHaveBeenCalledWith(
      entry.ref,
      1, // failureCount incremented from 0 to 1
      expect.any(String),
      false, // not final (1 < 3)
    );
  });

  it("failureCount=1 (2nd attempt) → isFinal = false", async () => {
    const entry = makeEntry({ failureCount: 1 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpayFailure();

    await runPayoutBatch(makeCtx());
    expect(mockRecordFailure).toHaveBeenCalledWith(entry.ref, 2, expect.any(String), false);
  });

  it("failureCount=2 (3rd attempt, MAX_FAILURES) → isFinal = true", async () => {
    const entry = makeEntry({ failureCount: 2 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpayFailure();

    await runPayoutBatch(makeCtx());
    expect(mockRecordFailure).toHaveBeenCalledWith(entry.ref, 3, expect.any(String), true);
  });

  it("final failure → ctx.logger.error called (not just warn)", async () => {
    const entry = makeEntry({ failureCount: 2 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpayFailure();

    const ctx = makeCtx();
    await runPayoutBatch(ctx);
    expect(ctx.logger.error).toHaveBeenCalled();
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  it("non-final failure → ctx.logger.warn called (not error)", async () => {
    const entry = makeEntry({ failureCount: 0 });
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpayFailure();

    const ctx = makeCtx();
    await runPayoutBatch(ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  it("failure does NOT call recordSuccess", async () => {
    const entry = makeEntry();
    mockGetPending.mockResolvedValue([entry]);
    mockRazorpayFailure();

    await runPayoutBatch(makeCtx());
    expect(mockRecordSuccess).not.toHaveBeenCalled();
  });
});

describe("runPayoutBatch — multiple payouts", () => {
  it("dispatches all payouts independently", async () => {
    const e1 = makeEntry({ id: "payout-A" });
    const e2 = makeEntry({ id: "payout-B" });
    mockGetPending.mockResolvedValue([e1, e2]);
    mockRazorpaySuccess();

    await runPayoutBatch(makeCtx());
    expect(mockMarkProcessing).toHaveBeenCalledTimes(2);
    expect(mockRecordSuccess).toHaveBeenCalledTimes(2);
  });

  it("one payout failure does NOT abort others (Promise.allSettled)", async () => {
    const e1 = makeEntry({ id: "payout-A", failureCount: 2 });
    const e2 = makeEntry({ id: "payout-B" });
    mockGetPending.mockResolvedValue([e1, e2]);

    // First call fails, second succeeds
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "err" })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "rzp_1", status: "processing" }) });

    await expect(runPayoutBatch(makeCtx())).resolves.toBeUndefined();
    expect(mockRecordSuccess).toHaveBeenCalledTimes(1);
    expect(mockRecordFailure).toHaveBeenCalledTimes(1);
  });

  it("logs batch summary with total/succeeded/failed counts", async () => {
    const e1 = makeEntry({ id: "payout-A" });
    const e2 = makeEntry({ id: "payout-B" });
    mockGetPending.mockResolvedValue([e1, e2]);
    mockRazorpaySuccess();

    const ctx = makeCtx();
    await runPayoutBatch(ctx);

    const summaryCall = (ctx.logger.info as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).toLowerCase().includes("complete"),
    );
    expect(summaryCall).toBeTruthy();
  });
});
