import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prizeDrawAssignWinner", () => ({
  assignPrizeDrawWinner: vi.fn().mockResolvedValue({ kind: "revealed" }),
}));

import { runPrizeDrawExpiryReveal } from "../prizeDrawExpiryReveal";
import { assignPrizeDrawWinner } from "../prizeDrawAssignWinner";
import type { JobContext } from "../../runtime/types";

function makeProductsSnap(docs: Array<{ id: string; prizeDrawMode?: string }>) {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      data: () => ({ prizeDrawMode: d.prizeDrawMode ?? "reveal" }),
      ref: { update: vi.fn() },
    })),
  };
}

function makeOrdersSnap(orderDocs: Array<{ id: string; prizeWon?: unknown }>) {
  return { docs: orderDocs.map((d) => ({ id: d.id, data: () => ({ prizeWon: d.prizeWon }) })) };
}

function makeCtx(productsSnap: ReturnType<typeof makeProductsSnap>, ordersSnap: ReturnType<typeof makeOrdersSnap>) {
  const db = {
    collection: vi.fn().mockImplementation((name: string) => {
      if (name === "products") {
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productsSnap),
        };
      }
      if (name === "orders") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(ordersSnap),
        };
      }
      return {};
    }),
  };
  return {
    db,
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn(() => "true"),
    job: "test",
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runPrizeDrawExpiryReveal", () => {
  it("no-ops when no products are past expiry", async () => {
    const ctx = makeCtx(makeProductsSnap([]), makeOrdersSnap([]));
    await runPrizeDrawExpiryReveal(ctx);
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });

  it("skips lottery-mode products", async () => {
    const productsSnap = makeProductsSnap([{ id: "product-1", prizeDrawMode: "lottery" }]);
    const ctx = makeCtx(productsSnap, makeOrdersSnap([{ id: "order-1" }]));
    await runPrizeDrawExpiryReveal(ctx);
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
    expect(productsSnap.docs[0].ref.update).not.toHaveBeenCalled();
  });

  it("assigns winners for outstanding paid unrevealed orders, then closes the product", async () => {
    const productsSnap = makeProductsSnap([{ id: "product-1" }]);
    const ordersSnap = makeOrdersSnap([{ id: "order-1" }, { id: "order-2", prizeWon: { itemNumber: 1 } }]);
    const ctx = makeCtx(productsSnap, ordersSnap);

    await runPrizeDrawExpiryReveal(ctx);

    expect(assignPrizeDrawWinner).toHaveBeenCalledTimes(1);
    expect(assignPrizeDrawWinner).toHaveBeenCalledWith(ctx, { orderId: "order-1", productId: "product-1" });
    expect(productsSnap.docs[0].ref.update).toHaveBeenCalledWith(
      expect.objectContaining({ prizeRevealStatus: "closed" }),
    );
  });

  it("is idempotent — a product already closed is never matched by the query in the first place", async () => {
    // The query itself filters prizeRevealStatus=="open", so a second sweep
    // naturally returns an empty product snapshot for an already-closed draw.
    const ctx = makeCtx(makeProductsSnap([]), makeOrdersSnap([]));
    await runPrizeDrawExpiryReveal(ctx);
    expect(assignPrizeDrawWinner).not.toHaveBeenCalled();
  });
});
