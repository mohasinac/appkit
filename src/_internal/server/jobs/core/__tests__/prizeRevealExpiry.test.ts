import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendNotification } = vi.hoisted(() => ({
  mockSendNotification: vi.fn(),
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));
vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { runPrizeRevealExpiry } from "../prizeRevealExpiry";
import type { JobContext } from "../../runtime/types";

function makeCtx(
  docs: {
    id: string;
    userId?: string;
    prizeWon?: boolean;
    prizeDrawProductId?: string;
    productTitle?: string;
  }[] = [],
) {
  const docUpdate = vi.fn().mockResolvedValue(undefined);
  const snap = {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      ref: { update: docUpdate, id: d.id },
      data: () => ({
        userId: d.userId,
        prizeWon: d.prizeWon,
        prizeDrawProductId: d.prizeDrawProductId,
        productTitle: d.productTitle,
      }),
    })),
  };
  const db = {
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(snap),
    }),
  };
  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _docUpdate: docUpdate,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
});

describe("runPrizeRevealExpiry — no past-deadline orders", () => {
  it("returns early without any updates when snap is empty", async () => {
    const ctx = makeCtx([]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx._docUpdate).not.toHaveBeenCalled();
  });
});

describe("runPrizeRevealExpiry — skips orders that don't qualify", () => {
  it("skips order with prizeWon set (already claimed)", async () => {
    const ctx = makeCtx([
      { id: "order-won", userId: "user-1", prizeWon: true, prizeDrawProductId: "product-pd-1" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx._docUpdate).not.toHaveBeenCalled();
  });

  it("skips order without prizeDrawProductId", async () => {
    const ctx = makeCtx([
      { id: "order-no-product", userId: "user-1" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx._docUpdate).not.toHaveBeenCalled();
  });
});

describe("runPrizeRevealExpiry — sets status to REFUNDED", () => {
  it("updates status to refunded for eligible expired orders", async () => {
    const ctx = makeCtx([
      { id: "order-1", userId: "user-1", prizeDrawProductId: "product-pd-1", productTitle: "Dragon Ball" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx._docUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "refunded",
        paymentStatus: "refunded",
        prizeRevealExpired: true,
      }),
    );
  });

  it("sends notification to userId when userId is set", async () => {
    const ctx = makeCtx([
      { id: "order-2", userId: "user-2", prizeDrawProductId: "product-pd-2", productTitle: "Charizard" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: "prize_reveal_expired",
      }),
    );
  });

  it("does NOT send notification when userId is missing", async () => {
    const ctx = makeCtx([
      { id: "order-3", prizeDrawProductId: "product-pd-3" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx._docUpdate).toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("runPrizeRevealExpiry — notification failure is non-fatal", () => {
  it("continues processing other orders when notification throws", async () => {
    mockSendNotification.mockRejectedValueOnce(new Error("notification failed")).mockResolvedValue(undefined);
    const ctx = makeCtx([
      { id: "order-a", userId: "user-a", prizeDrawProductId: "product-pd-a" },
      { id: "order-b", userId: "user-b", prizeDrawProductId: "product-pd-b" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx._docUpdate).toHaveBeenCalledTimes(2);
    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});

describe("runPrizeRevealExpiry — logs completion", () => {
  it("logs refunded count", async () => {
    const ctx = makeCtx([
      { id: "order-4", userId: "user-4", prizeDrawProductId: "product-pd-4" },
    ]);
    await runPrizeRevealExpiry(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/expiry sweep complete/i),
      expect.objectContaining({ refunded: 1 }),
    );
  });
});
