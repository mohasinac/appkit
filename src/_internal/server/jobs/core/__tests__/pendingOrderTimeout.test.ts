import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../repositories", () => ({
  orderRepository: {
    getTimedOutPending: vi.fn(),
    cancelInBatch: vi.fn(),
  },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../handlers/messages", () => ({
  ORDER_MESSAGES: {
    CANCELLED_TITLE: "Order cancelled",
    CANCELLED_TIMEOUT_MESSAGE: (title: string, hours: number) =>
      `${title} cancelled after ${hours}h`,
  },
}));

import { runPendingOrderTimeout } from "../pendingOrderTimeout";
import { orderRepository } from "../../../../../repositories";
import { sendNotification } from "../../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../../runtime/types";

function makeBatch() {
  return { commit: vi.fn().mockResolvedValue(undefined) };
}

function makeCtxWithBatch(envOverrides: Record<string, string> = {}) {
  const batch = makeBatch();
  const ctx: JobContext = {
    job: "pending-order-timeout",
    db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: (key) => envOverrides[key],
    now: new Date("2026-01-15T12:00:00Z"),
  };
  return { ctx, batch };
}

function makeCtx(envOverrides: Record<string, string> = {}): JobContext {
  return makeCtxWithBatch(envOverrides).ctx;
}

beforeEach(() => {
  vi.clearAllMocks();
  (sendNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe("runPendingOrderTimeout", () => {
  it("returns early when no timed-out orders exist", async () => {
    (orderRepository.getTimedOutPending as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ctx = makeCtx();
    await runPendingOrderTimeout(ctx);
    expect(ctx.db.batch).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("uses DEFAULT_TIMEOUT_HOURS (24) when env var is unset", async () => {
    (orderRepository.getTimedOutPending as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ctx = makeCtx();
    await runPendingOrderTimeout(ctx);
    expect(orderRepository.getTimedOutPending).toHaveBeenCalledWith(24);
  });

  it("uses ORDER_TIMEOUT_HOURS from env when set", async () => {
    (orderRepository.getTimedOutPending as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ctx = makeCtx({ ORDER_TIMEOUT_HOURS: "48" });
    await runPendingOrderTimeout(ctx);
    expect(orderRepository.getTimedOutPending).toHaveBeenCalledWith(48);
  });

  it("cancels timed-out orders in the batch", async () => {
    const ref1 = { id: "order-ref-1" };
    const ref2 = { id: "order-ref-2" };
    const timedOut = [
      { ref: ref1, data: { userId: "u1", productTitle: "Charizard", id: "order-1" } },
      { ref: ref2, data: { userId: "u2", productTitle: "Blastoise", id: "order-2" } },
    ];
    (orderRepository.getTimedOutPending as ReturnType<typeof vi.fn>).mockResolvedValue(timedOut);
    const { ctx, batch } = makeCtxWithBatch();
    await runPendingOrderTimeout(ctx);
    expect(orderRepository.cancelInBatch).toHaveBeenCalledTimes(2);
    expect(orderRepository.cancelInBatch).toHaveBeenCalledWith(batch, ref1);
    expect(orderRepository.cancelInBatch).toHaveBeenCalledWith(batch, ref2);
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it("sends a notification for each cancelled order", async () => {
    const timedOut = [
      { ref: {}, data: { userId: "u1", productTitle: "Charizard", id: "order-1" } },
      { ref: {}, data: { userId: "u2", productTitle: "Blastoise", id: "order-2" } },
    ];
    (orderRepository.getTimedOutPending as ReturnType<typeof vi.fn>).mockResolvedValue(timedOut);
    const ctx = makeCtx();
    await runPendingOrderTimeout(ctx);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: "order_cancelled", relatedId: "order-1" }),
    );
  });

  it("does not throw when a notification fails (Promise.allSettled)", async () => {
    const timedOut = [
      { ref: {}, data: { userId: "u1", productTitle: "Pikachu", id: "order-x" } },
    ];
    (orderRepository.getTimedOutPending as ReturnType<typeof vi.fn>).mockResolvedValue(timedOut);
    (sendNotification as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Notification failed"));
    const ctx = makeCtx();
    await expect(runPendingOrderTimeout(ctx)).resolves.toBeUndefined();
  });
});
