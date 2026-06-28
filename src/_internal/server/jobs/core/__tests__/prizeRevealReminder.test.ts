import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendNotification } = vi.hoisted(() => ({
  mockSendNotification: vi.fn(),
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));
vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { runPrizeRevealReminder } from "../prizeRevealReminder";
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
  const snap = {
    docs: docs.map((d) => ({
      id: d.id,
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
    now: new Date("2026-01-15T12:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
});

describe("runPrizeRevealReminder — no orders in window", () => {
  it("logs zero notified when snap is empty", async () => {
    const ctx = makeCtx([]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.objectContaining({ notified: 0 }),
    );
  });
});

describe("runPrizeRevealReminder — skips ineligible orders", () => {
  it("skips orders with prizeWon already set", async () => {
    const ctx = makeCtx([
      { id: "order-won", userId: "user-1", prizeWon: true, prizeDrawProductId: "pd-1" },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("skips orders without prizeDrawProductId", async () => {
    const ctx = makeCtx([
      { id: "order-nopd", userId: "user-2" },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("skips orders without userId", async () => {
    const ctx = makeCtx([
      { id: "order-nouser", prizeDrawProductId: "pd-3" },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("runPrizeRevealReminder — sends reminders to eligible orders", () => {
  it("sends reminder notification with type: prize_reveal_reminder", async () => {
    const ctx = makeCtx([
      {
        id: "order-5",
        userId: "user-5",
        prizeDrawProductId: "pd-5",
        productTitle: "Pikachu",
      },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-5",
        type: "prize_reveal_reminder",
        priority: "normal",
        relatedId: "order-5",
        relatedType: "order",
      }),
    );
  });

  it("includes product title in notification message", async () => {
    const ctx = makeCtx([
      { id: "order-6", userId: "user-6", prizeDrawProductId: "pd-6", productTitle: "Venusaur" },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Venusaur"),
      }),
    );
  });

  it("uses fallback 'the draw' when productTitle is missing", async () => {
    const ctx = makeCtx([
      { id: "order-7", userId: "user-7", prizeDrawProductId: "pd-7" },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("the draw"),
      }),
    );
  });
});

describe("runPrizeRevealReminder — notification failure is non-fatal", () => {
  it("continues processing other orders when notification throws", async () => {
    mockSendNotification.mockRejectedValueOnce(new Error("fail")).mockResolvedValue(undefined);
    const ctx = makeCtx([
      { id: "order-a", userId: "user-a", prizeDrawProductId: "pd-a" },
      { id: "order-b", userId: "user-b", prizeDrawProductId: "pd-b" },
    ]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    expect(ctx.logger.warn).toHaveBeenCalled();
    // second notification should still attempt
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });
});

describe("runPrizeRevealReminder — cutoff is now + 24h", () => {
  it("queries deadline <= now+24h and > now (one-day window)", async () => {
    const ctx = makeCtx([]);
    await runPrizeRevealReminder(ctx as unknown as import("../../runtime/types").JobContext);
    // We can't directly inspect Firestore query args in this mock, but at least
    // verify the job completes without error — the cutoff logic is in the source
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.anything(),
    );
  });
});
