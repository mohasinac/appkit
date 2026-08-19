import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prizeDrawAssignWinner", () => ({
  assignPrizeDrawWinner: vi.fn().mockResolvedValue({ kind: "revealed" }),
}));

import { handlePrizeDrawPaymentConfirmed } from "../onPrizeDrawPaymentConfirmed";
import { assignPrizeDrawWinner } from "../prizeDrawAssignWinner";
import type { JobContext } from "../../runtime/types";

function makeCtx(product: Record<string, unknown> | null) {
  return {
    db: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: !!product, data: () => product }),
        }),
      }),
    },
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn(() => "true"),
    job: "test",
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handlePrizeDrawPaymentConfirmed", () => {
  it("no-ops when the order has no prizeDrawProductId", async () => {
    const ctx = makeCtx({ prizeRevealMode: "instant" });
    await handlePrizeDrawPaymentConfirmed({ orderId: "order-1", order: { items: [{ listingType: "prize-draw" }] } }, ctx);
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("no-ops when no line item is a prize-draw", async () => {
    const ctx = makeCtx({ prizeRevealMode: "instant" });
    await handlePrizeDrawPaymentConfirmed(
      { orderId: "order-1", order: { prizeDrawProductId: "product-1", items: [{ listingType: "standard" }] } },
      ctx,
    );
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("no-ops when the product's reveal mode isn't instant", async () => {
    const ctx = makeCtx({ prizeRevealMode: "scheduled" });
    await handlePrizeDrawPaymentConfirmed(
      { orderId: "order-1", order: { prizeDrawProductId: "product-1", items: [{ listingType: "prize-draw" }] } },
      ctx,
    );
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("assigns a winner when the order is a paid instant-mode prize-draw purchase", async () => {
    const ctx = makeCtx({ prizeRevealMode: "instant" });
    await handlePrizeDrawPaymentConfirmed(
      { orderId: "order-1", order: { prizeDrawProductId: "product-1", items: [{ listingType: "prize-draw" }] } },
      ctx,
    );
    expect(assignPrizeDrawWinner).toHaveBeenCalledWith(ctx, { orderId: "order-1", productId: "product-1" });
  });
});
