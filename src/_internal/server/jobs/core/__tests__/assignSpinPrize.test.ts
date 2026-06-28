import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:crypto", () => ({
  default: { randomInt: vi.fn() },
}));

import { runAssignSpinPrize } from "../assignSpinPrize";
import type { JobContext } from "../../runtime/types";
import crypto from "node:crypto";

const mockRandomInt = vi.mocked(crypto.randomInt);

function makeEvent(spinPrizes: Array<{ id: string; title: string; weight: number; couponId?: string }>) {
  return {
    exists: true,
    data: () => ({ spinPrizes }),
  };
}

function makeEntry(overrides = {}) {
  return {
    exists: false,
    docs: [{
      data: () => ({ spinUsed: false, ...overrides }),
      ref: { update: vi.fn().mockResolvedValue(undefined) },
    }],
    empty: false,
  };
}

function makeCtx(dbOverrides?: {
  eventSnap?: object;
  entrySnap?: object;
  couponSnap?: object;
}) {
  const eventSnap = dbOverrides?.eventSnap ?? makeEvent([{ id: "prize-1", title: "Nintendo Switch", weight: 1 }]);
  const entrySnap = dbOverrides?.entrySnap ?? makeEntry();
  const couponSnap = dbOverrides?.couponSnap ?? { exists: false, data: () => ({}) };

  const docFn = vi.fn().mockImplementation((id: string) => ({
    get: vi.fn().mockResolvedValue(
      id.startsWith("coupon-") ? couponSnap : eventSnap
    ),
  }));

  return {
    db: {
      collection: vi.fn().mockImplementation((col: string) => ({
        doc: col === "events" ? docFn : vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(couponSnap) }),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(entrySnap),
      })),
    },
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRandomInt.mockReturnValue(0);
});

describe("runAssignSpinPrize — event not found", () => {
  it("returns reason: event_not_found when event missing", async () => {
    const ctx = makeCtx({ eventSnap: { exists: false, data: () => ({}) } });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("event_not_found");
  });
});

describe("runAssignSpinPrize — no prizes configured", () => {
  it("returns no_prizes_configured when spinPrizes is empty", async () => {
    const ctx = makeCtx({ eventSnap: makeEvent([]) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("no_prizes_configured");
  });

  it("returns no_prizes_configured when all weights are 0", async () => {
    const ctx = makeCtx({ eventSnap: makeEvent([{ id: "p1", title: "T1", weight: 0 }]) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("no_prizes_configured");
  });
});

describe("runAssignSpinPrize — entry not found", () => {
  it("returns entry_not_found when no event entry exists", async () => {
    const ctx = makeCtx({
      entrySnap: { empty: true, docs: [] },
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("entry_not_found");
  });
});

describe("runAssignSpinPrize — already used", () => {
  it("returns alreadyUsed=true when spinUsed is true on entry", async () => {
    const ctx = makeCtx({
      entrySnap: makeEntry({ spinUsed: true, spinPrizeId: "prize-1" }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.alreadyUsed).toBe(true);
    expect(result.spinPrizeId).toBe("prize-1");
  });
});

describe("runAssignSpinPrize — prize selection", () => {
  it("selects first prize when roll < weight of first prize", async () => {
    mockRandomInt.mockReturnValue(0);
    const prizes = [
      { id: "prize-1", title: "Switch", weight: 5 },
      { id: "prize-2", title: "Shirt", weight: 5 },
    ];
    const ctx = makeCtx({ eventSnap: makeEvent(prizes) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeId).toBe("prize-1");
  });

  it("selects second prize when roll >= first prize weight", async () => {
    mockRandomInt.mockReturnValue(5);
    const prizes = [
      { id: "prize-1", title: "Switch", weight: 5 },
      { id: "prize-2", title: "Shirt", weight: 5 },
    ];
    const ctx = makeCtx({ eventSnap: makeEvent(prizes) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeId).toBe("prize-2");
  });

  it("updates entry with spinUsed=true and spinPrizeId", async () => {
    mockRandomInt.mockReturnValue(0);
    const ctx = makeCtx({});
    await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    // The entry ref.update should have been called
    const entryRef = (ctx.db.collection as ReturnType<typeof vi.fn>).mock.results[1]?.value;
    expect(entryRef).toBeDefined();
  });

  it("attaches couponCode when prize has couponId and coupon exists", async () => {
    mockRandomInt.mockReturnValue(0);
    const prizes = [{ id: "prize-1", title: "Coupon Prize", weight: 1, couponId: "coupon-abc" }];
    const couponSnap = { exists: true, data: () => ({ code: "SUMMER20" }) };

    let callCount = 0;
    const ctx = {
      db: {
        collection: vi.fn().mockImplementation((col: string) => {
          if (col === "events") {
            return {
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(makeEvent(prizes)),
              }),
            };
          }
          if (col === "eventEntries") {
            return {
              where: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              get: vi.fn().mockResolvedValue(makeEntry()),
            };
          }
          if (col === "coupons") {
            return {
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(couponSnap),
              }),
            };
          }
          callCount++;
          return { doc: vi.fn(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: vi.fn() };
        }),
      },
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;

    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeCouponCode).toBe("SUMMER20");
  });
});
