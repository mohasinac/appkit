import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prizeDrawAssignWinner", () => ({
  assignPrizeDrawWinner: vi.fn().mockResolvedValue({ kind: "revealed" }),
}));

import { handlePrizeDrawSoldOut } from "../prizeDrawSoldOutReveal";
import { assignPrizeDrawWinner } from "../prizeDrawAssignWinner";
import type { JobContext } from "../../runtime/types";

function makeOrdersSnap(orderDocs: Array<{ id: string; prizeWon?: unknown }>) {
  return {
    docs: orderDocs.map((d) => ({ id: d.id, data: () => ({ prizeWon: d.prizeWon }) })),
  };
}

function makeCtx(ordersSnap: ReturnType<typeof makeOrdersSnap>) {
  const productUpdate = vi.fn();
  const db = {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === "orders") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(ordersSnap),
        };
      }
      if (name === "products") {
        return { doc: vi.fn().mockReturnValue({ update: productUpdate }) };
      }
      return {};
    }),
  };
  const ctx = {
    db,
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn(() => "true"),
    job: "test",
  } as unknown as JobContext;
  return { ctx, productUpdate };
}

const baseProduct = {
  listingType: "prize-draw",
  prizeDrawMode: "reveal",
  prizeRevealMode: "scheduled",
  prizeRevealStatus: "open",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handlePrizeDrawSoldOut", () => {
  it("no-ops for lottery-mode draws", async () => {
    const { ctx } = makeCtx(makeOrdersSnap([]));
    await handlePrizeDrawSoldOut(
      {
        productId: "product-1",
        before: { ...baseProduct, prizeCurrentEntries: 1, prizeMaxEntries: 2 },
        after: { ...baseProduct, prizeDrawMode: "lottery", prizeCurrentEntries: 2, prizeMaxEntries: 2 },
      },
      ctx,
    );
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("no-ops for instant-mode draws (sellout trigger is scheduled-mode only)", async () => {
    const { ctx } = makeCtx(makeOrdersSnap([]));
    await handlePrizeDrawSoldOut(
      {
        productId: "product-1",
        before: { ...baseProduct, prizeRevealMode: "instant", prizeCurrentEntries: 1, prizeMaxEntries: 2 },
        after: { ...baseProduct, prizeRevealMode: "instant", prizeCurrentEntries: 2, prizeMaxEntries: 2 },
      },
      ctx,
    );
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("no-ops when the write did not cross into sold-out", async () => {
    const { ctx } = makeCtx(makeOrdersSnap([]));
    await handlePrizeDrawSoldOut(
      {
        productId: "product-1",
        before: { ...baseProduct, prizeCurrentEntries: 0, prizeMaxEntries: 2 },
        after: { ...baseProduct, prizeCurrentEntries: 1, prizeMaxEntries: 2 },
      },
      ctx,
    );
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("no-ops when already closed (idempotent against repeated writes after sellout)", async () => {
    const { ctx } = makeCtx(makeOrdersSnap([]));
    await handlePrizeDrawSoldOut(
      {
        productId: "product-1",
        before: { ...baseProduct, prizeRevealStatus: "closed", prizeCurrentEntries: 2, prizeMaxEntries: 2 },
        after: { ...baseProduct, prizeRevealStatus: "closed", prizeCurrentEntries: 2, prizeMaxEntries: 2 },
      },
      ctx,
    );
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("assigns winners for every unrevealed paid order and closes the draw on the sellout crossing", async () => {
    const ordersSnap = makeOrdersSnap([{ id: "order-1" }, { id: "order-2", prizeWon: { itemNumber: 1 } }]);
    const { ctx, productUpdate } = makeCtx(ordersSnap);
    await handlePrizeDrawSoldOut(
      {
        productId: "product-1",
        before: { ...baseProduct, prizeCurrentEntries: 1, prizeMaxEntries: 2 },
        after: { ...baseProduct, prizeCurrentEntries: 2, prizeMaxEntries: 2 },
      },
      ctx,
    );

    // order-2 already has prizeWon — only order-1 should be assigned.
    expect(assignPrizeDrawWinner).toHaveBeenCalledTimes(1);
    expect(assignPrizeDrawWinner).toHaveBeenCalledWith(ctx, { orderId: "order-1", productId: "product-1" });
    expect(productUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ prizeRevealStatus: "closed" }),
    );
  });
});
