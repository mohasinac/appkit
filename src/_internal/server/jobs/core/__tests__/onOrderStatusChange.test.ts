import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSendNotification,
  mockRtdbPush,
  mockDecryptPii,
} = vi.hoisted(() => ({
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
  mockRtdbPush: vi.fn().mockResolvedValue(undefined),
  mockDecryptPii: vi.fn((v: string) => v),
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../providers/db-firebase", () => ({
  getAdminRealtimeDb: vi.fn(() => ({
    ref: vi.fn(() => ({ push: mockRtdbPush })),
  })),
}));

vi.mock("../../../../../security/index", () => ({
  decryptPii: mockDecryptPii,
}));

vi.mock("../../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { handleOrderStatusChange } from "../onOrderStatusChange";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx() {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

function makeInput(
  beforeStatus: string,
  afterStatus: string,
  extraAfter = {},
) {
  return {
    orderId: "order-1",
    before: { status: beforeStatus },
    after: {
      status: afterStatus,
      userId: "user-ravi",
      userEmail: "ravi@example.com",
      productTitle: "Pokemon Charizard",
      trackingNumber: "TRK123",
      ...extraAfter,
    },
  } as Parameters<typeof handleOrderStatusChange>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
  mockRtdbPush.mockResolvedValue(undefined);
  mockDecryptPii.mockImplementation((v: string) => v);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("handleOrderStatusChange — early exits", () => {
  it("returns immediately when before is null", async () => {
    const ctx = makeCtx();
    await handleOrderStatusChange({ orderId: "o1", before: null, after: null }, ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns immediately when after is null", async () => {
    const ctx = makeCtx();
    await handleOrderStatusChange({ orderId: "o1", before: { status: "pending" }, after: null }, ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns when status has not changed", async () => {
    const ctx = makeCtx();
    await handleOrderStatusChange(makeInput("confirmed", "confirmed"), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("logs and returns when new status has no handler config", async () => {
    const ctx = makeCtx();
    await handleOrderStatusChange(makeInput("pending", "returned"), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/No handler for status transition/i),
      expect.any(Object),
    );
  });
});

describe("handleOrderStatusChange — confirmed", () => {
  it("sends order_confirmed notification to buyer", async () => {
    await handleOrderStatusChange(makeInput("pending", "confirmed"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-ravi", type: "order_confirmed" }),
    );
  });

  it("includes decrypted userEmail in notification payload", async () => {
    mockDecryptPii.mockReturnValue("decrypted@example.com");
    await handleOrderStatusChange(makeInput("pending", "confirmed"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "decrypted@example.com" }),
    );
  });

  it("pushes to RTDB for real-time notification", async () => {
    await handleOrderStatusChange(makeInput("pending", "confirmed"), makeCtx());
    expect(mockRtdbPush).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order_confirmed" }),
    );
  });
});

describe("handleOrderStatusChange — shipped", () => {
  it("sends order_shipped notification with high priority", async () => {
    await handleOrderStatusChange(makeInput("confirmed", "shipped"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order_shipped", priority: "high" }),
    );
  });

  it("notification message includes tracking number", async () => {
    await handleOrderStatusChange(makeInput("confirmed", "shipped", { trackingNumber: "AWB123" }), makeCtx());
    const notifCall = mockSendNotification.mock.calls[0][0];
    expect(notifCall.message).toMatch(/AWB123/);
  });
});

describe("handleOrderStatusChange — delivered", () => {
  it("sends order_delivered notification", async () => {
    await handleOrderStatusChange(makeInput("shipped", "delivered"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order_delivered" }),
    );
  });

  it("notification relatedId = orderId, relatedType = 'order'", async () => {
    await handleOrderStatusChange(makeInput("shipped", "delivered"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ relatedId: "order-1", relatedType: "order" }),
    );
  });
});

describe("handleOrderStatusChange — cancelled", () => {
  it("sends order_cancelled notification", async () => {
    await handleOrderStatusChange(makeInput("pending", "cancelled"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "order_cancelled" }),
    );
  });

  it("cancelled message mentions the product title", async () => {
    await handleOrderStatusChange(makeInput("pending", "cancelled", { productTitle: "Hot Wheels Redline" }), makeCtx());
    const notifCall = mockSendNotification.mock.calls[0][0];
    expect(notifCall.message).toMatch(/Hot Wheels Redline/);
  });
});

describe("handleOrderStatusChange — RTDB failure is non-fatal", () => {
  it("RTDB push failure → logs but does NOT re-throw", async () => {
    mockRtdbPush.mockRejectedValue(new Error("RTDB down"));
    const ctx = makeCtx();
    await expect(handleOrderStatusChange(makeInput("pending", "confirmed"), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Realtime DB/i),
      expect.any(Error),
    );
  });

  it("Firestore notification still sent even when RTDB fails", async () => {
    mockRtdbPush.mockRejectedValue(new Error("RTDB down"));
    await handleOrderStatusChange(makeInput("pending", "confirmed"), makeCtx());
    expect(mockSendNotification).toHaveBeenCalled();
  });
});

describe("handleOrderStatusChange — error propagation", () => {
  it("sendNotification failure → re-throws", async () => {
    mockSendNotification.mockRejectedValue(new Error("Notification service down"));
    await expect(
      handleOrderStatusChange(makeInput("pending", "confirmed"), makeCtx()),
    ).rejects.toThrow("Notification service down");
  });

  it("logs error context before re-throwing", async () => {
    mockSendNotification.mockRejectedValue(new Error("Notification service down"));
    const ctx = makeCtx();
    try {
      await handleOrderStatusChange(makeInput("pending", "confirmed"), ctx);
    } catch {
      // expected
    }
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Error),
      expect.objectContaining({ orderId: "order-1" }),
    );
  });
});
