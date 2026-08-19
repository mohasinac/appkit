import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:crypto", () => ({
  default: { randomInt: vi.fn() },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

import { assignPrizeDrawWinner } from "../prizeDrawAssignWinner";
import type { JobContext } from "../../runtime/types";
import crypto from "node:crypto";
import { sendNotification } from "../../../../../features/admin/actions/notification-actions";

const mockRandomInt = vi.mocked(crypto.randomInt);

interface FakeRef {
  __id: string;
}

function makeRef(id: string): FakeRef {
  return { __id: id };
}

function makeCtx(args: {
  product: Record<string, unknown> | null;
  order: Record<string, unknown> | null;
  featureEnabled?: boolean;
}) {
  const { product, order, featureEnabled = true } = args;
  const productRef = makeRef("products/product-1");
  const orderRef = makeRef("orders/order-1");

  const productUpdate = vi.fn();
  const orderUpdate = vi.fn();

  const tx = {
    get: vi.fn().mockImplementation((ref: FakeRef) => {
      if (ref === productRef) {
        return Promise.resolve({ exists: !!product, data: () => product });
      }
      if (ref === orderRef) {
        return Promise.resolve({ exists: !!order, data: () => order });
      }
      return Promise.resolve({ exists: false, data: () => null });
    }),
    update: vi.fn().mockImplementation((ref: FakeRef, data: unknown) => {
      if (ref === productRef) productUpdate(data);
      if (ref === orderRef) orderUpdate(data);
    }),
  };

  const db = {
    collection: vi.fn().mockImplementation((name: string) => ({
      doc: vi.fn().mockImplementation((id: string) => {
        if (name === "products") return productRef;
        if (name === "orders") return orderRef;
        return makeRef(`${name}/${id}`);
      }),
    })),
    runTransaction: vi.fn().mockImplementation(async (cb: (tx: typeof tx) => unknown) => cb(tx)),
  };

  const ctx = {
    db,
    now: new Date("2026-05-10T00:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn((key: string) => (key === "FEATURE_PRIZE_DRAWS" ? (featureEnabled ? "true" : "false") : undefined)),
    job: "test",
  } as unknown as JobContext;

  return { ctx, productUpdate, orderUpdate };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRandomInt.mockReturnValue(0);
});

describe("assignPrizeDrawWinner", () => {
  it("returns not_eligible when FEATURE_PRIZE_DRAWS is disabled", async () => {
    const { ctx } = makeCtx({ product: {}, order: {}, featureEnabled: false });
    const result = await assignPrizeDrawWinner(ctx, { orderId: "order-1", productId: "product-1" });
    expect(result.kind).toBe("not_eligible");
  });

  it("returns already_revealed idempotently when order.prizeWon is already set", async () => {
    const prizeWon = { itemNumber: 1, title: "Existing win", images: [], wonAt: new Date() };
    const { ctx } = makeCtx({
      product: { prizeDrawItems: [{ itemNumber: 1, title: "X", images: [], isWon: true }] },
      order: { paymentStatus: "paid", status: "pending", prizeWon },
    });
    const result = await assignPrizeDrawWinner(ctx, { orderId: "order-1", productId: "product-1" });
    expect(result.kind).toBe("already_revealed");
    expect(result.prizeWon).toEqual(prizeWon);
  });

  it("returns not_eligible when the order isn't paid", async () => {
    const { ctx } = makeCtx({
      product: { prizeDrawItems: [{ itemNumber: 1, title: "X", images: [], isWon: false }] },
      order: { paymentStatus: "pending", status: "pending" },
    });
    const result = await assignPrizeDrawWinner(ctx, { orderId: "order-1", productId: "product-1" });
    expect(result.kind).toBe("not_eligible");
  });

  it("returns pool_exhausted when every item is already won, without refunding", async () => {
    const { ctx, orderUpdate } = makeCtx({
      product: { prizeDrawItems: [{ itemNumber: 1, title: "X", images: [], isWon: true }] },
      order: { paymentStatus: "paid", status: "pending" },
    });
    const result = await assignPrizeDrawWinner(ctx, { orderId: "order-1", productId: "product-1" });
    expect(result.kind).toBe("pool_exhausted");
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("picks an unwon item via crypto.randomInt, marks it won with the order id, and notifies the buyer", async () => {
    mockRandomInt.mockReturnValue(1); // picks the second unwon item
    const { ctx, productUpdate, orderUpdate } = makeCtx({
      product: {
        prizeDrawItems: [
          { itemNumber: 1, title: "Won already", images: [], isWon: true },
          { itemNumber: 2, title: "Prize A", images: ["a.png"], isWon: false },
          { itemNumber: 3, title: "Prize B", images: ["b.png"], isWon: false },
        ],
      },
      order: { paymentStatus: "paid", status: "pending", userId: "user-1", items: [{ listingType: "prize-draw" }] },
    });

    const result = await assignPrizeDrawWinner(ctx, { orderId: "order-1", productId: "product-1" });

    expect(result.kind).toBe("revealed");
    expect(result.prizeWon?.itemNumber).toBe(3);

    const updatedItems = productUpdate.mock.calls[0][0].prizeDrawItems;
    expect(updatedItems.find((i: { itemNumber: number }) => i.itemNumber === 3)).toMatchObject({
      isWon: true,
      wonByOrderId: "order-1",
    });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        prizeWon: expect.objectContaining({ itemNumber: 3 }),
        items: [expect.objectContaining({ listingType: "prize-draw", prizeRevealStatus: "revealed" })],
      }),
    );

    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "prize_won" }),
    );
  });
});
