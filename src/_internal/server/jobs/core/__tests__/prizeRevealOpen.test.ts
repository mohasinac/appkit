import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendNotification } = vi.hoisted(() => ({
  mockSendNotification: vi.fn(),
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));
vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { runPrizeRevealOpen } from "../prizeRevealOpen";
import type { JobContext } from "../../runtime/types";

function makeCtx(
  productDocs: { id: string; title?: string; prizeRevealDeadlineDays?: number }[] = [],
  orderDocs: { id: string; userId?: string; prizeWon?: boolean }[] = [],
) {
  const productDocUpdate = vi.fn().mockResolvedValue(undefined);
  const productSnap = {
    empty: productDocs.length === 0,
    docs: productDocs.map((d) => ({
      id: d.id,
      data: () => ({ title: d.title ?? "Awesome Prize", prizeRevealDeadlineDays: d.prizeRevealDeadlineDays }),
      ref: { update: productDocUpdate },
    })),
  };
  const orderSnap = {
    docs: orderDocs.map((o) => ({
      id: o.id,
      data: () => ({ userId: o.userId, prizeWon: o.prizeWon }),
    })),
  };

  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "products") {
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }
      // orders collection
      return {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(orderSnap),
      };
    }),
  };

  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _productUpdate: productDocUpdate,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
});

describe("runPrizeRevealOpen — no products to open", () => {
  it("returns early without querying orders when snap is empty", async () => {
    const ctx = makeCtx([]);
    await runPrizeRevealOpen(ctx);
    expect(ctx._productUpdate).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no prize draws to open/i));
  });
});

describe("runPrizeRevealOpen — opens pending draws", () => {
  it("updates prizeRevealStatus to open on the product", async () => {
    const ctx = makeCtx([{ id: "auction-pd-1", title: "Dragon Ball" }], []);
    await runPrizeRevealOpen(ctx);
    expect(ctx._productUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ prizeRevealStatus: "open" }),
    );
  });

  it("sends notification to each buyer with a paid unclaimed order", async () => {
    const ctx = makeCtx(
      [{ id: "auction-pd-1", title: "Charizard PSA-9", prizeRevealDeadlineDays: 3 }],
      [{ id: "order-1", userId: "user-1" }, { id: "order-2", userId: "user-2" }],
    );
    await runPrizeRevealOpen(ctx);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "prize_reveal_ready" }),
    );
  });

  it("skips orders where prizeWon is already set", async () => {
    const ctx = makeCtx(
      [{ id: "auction-pd-2" }],
      [{ id: "order-won", userId: "user-won", prizeWon: true }],
    );
    await runPrizeRevealOpen(ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("skips orders without a userId", async () => {
    const ctx = makeCtx(
      [{ id: "auction-pd-3" }],
      [{ id: "order-no-user" }],
    );
    await runPrizeRevealOpen(ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("runPrizeRevealOpen — notification failure is non-fatal", () => {
  it("continues processing other orders when notification throws", async () => {
    mockSendNotification.mockRejectedValueOnce(new Error("notif fail")).mockResolvedValue(undefined);
    const ctx = makeCtx(
      [{ id: "auction-pd-4" }],
      [{ id: "order-a", userId: "user-a" }, { id: "order-b", userId: "user-b" }],
    );
    await runPrizeRevealOpen(ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});

describe("runPrizeRevealOpen — deadline days in notification", () => {
  it("uses prizeRevealDeadlineDays from product (default 3 when absent)", async () => {
    const ctx = makeCtx(
      [{ id: "auction-pd-5" }],
      [{ id: "order-5", userId: "user-5" }],
    );
    await runPrizeRevealOpen(ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("3") }),
    );
  });
});
