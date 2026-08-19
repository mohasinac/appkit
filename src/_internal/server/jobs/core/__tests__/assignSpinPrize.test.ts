import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:crypto", () => ({
  default: { randomInt: vi.fn() },
}));

import { runAssignSpinPrize } from "../assignSpinPrize";
import type { JobContext } from "../../runtime/types";
import crypto from "node:crypto";

const mockRandomInt = vi.mocked(crypto.randomInt);

function makeEvent(
  spinPrizes: Array<{ id: string; label: string; weight: number; couponId?: string }>,
  overrides: Record<string, unknown> = {},
) {
  return {
    exists: true,
    data: () => ({ spinPrizes, ...overrides }),
  };
}

function makeEntrySnap(overrides: Record<string, unknown> = {}, empty = false) {
  if (empty) return { empty: true, docs: [] };
  return {
    empty: false,
    docs: [
      {
        data: () => ({ spinUsed: false, ...overrides }),
        ref: { __kind: "existingEntryRef" },
      },
    ],
  };
}

function makeCtx(overrides?: {
  eventSnap?: object;
  entrySnap?: object;
  couponSnap?: object;
  env?: Record<string, string>;
}) {
  const eventSnap = overrides?.eventSnap ?? makeEvent([{ id: "prize-1", label: "Nintendo Switch", weight: 1 }]);
  const entrySnap = overrides?.entrySnap ?? makeEntrySnap();
  const couponSnap = overrides?.couponSnap ?? { exists: false, data: () => ({}) };

  const entriesQueryMarker = { __kind: "entriesQuery" };
  const couponRefMarker = { __kind: "couponRef" };
  const newEntryRefMarker = { __kind: "newEntryRef" };

  const eventsCollection = {
    doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(eventSnap) }),
  };
  const eventEntriesCollection = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(entriesQueryMarker),
    doc: vi.fn().mockReturnValue(newEntryRefMarker),
  };
  const couponsCollection = {
    doc: vi.fn().mockReturnValue(couponRefMarker),
  };

  const txGet = vi.fn().mockImplementation(async (target: unknown) => {
    if (target === entriesQueryMarker) return entrySnap;
    if (target === couponRefMarker) return couponSnap;
    return { exists: false, data: () => ({}) };
  });
  const txSet = vi.fn();
  const txUpdate = vi.fn();

  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "events") return eventsCollection;
      if (col === "eventEntries") return eventEntriesCollection;
      if (col === "coupons") return couponsCollection;
      return { doc: vi.fn(), where: vi.fn().mockReturnThis(), limit: vi.fn() };
    }),
    runTransaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ get: txGet, set: txSet, update: txUpdate });
    }),
  };

  const envMap: Record<string, string> = { FEATURE_PRIZE_DRAWS: "true", ...overrides?.env };

  return {
    db,
    now: new Date("2026-08-20T12:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: (key: string) => envMap[key],
    txSet,
    txUpdate,
  } as unknown as JobContext & { txSet: typeof txSet; txUpdate: typeof txUpdate };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRandomInt.mockReturnValue(0);
});

describe("runAssignSpinPrize — identity required", () => {
  it("returns reason: identity_required when neither userId nor guestIpHash is given", async () => {
    const ctx = makeCtx();
    const result = await runAssignSpinPrize({ eventId: "event-1" }, ctx);
    expect(result.reason).toBe("identity_required");
  });
});

describe("runAssignSpinPrize — event not found", () => {
  it("returns reason: event_not_found when event missing", async () => {
    const ctx = makeCtx({ eventSnap: { exists: false, data: () => ({}) } });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("event_not_found");
  });
});

describe("runAssignSpinPrize — guest participation gating", () => {
  it("returns login_required for a guest when allowGuestParticipation is falsy", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], { allowGuestParticipation: false }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", guestIpHash: "hash-1" }, ctx);
    expect(result.reason).toBe("login_required");
  });

  it("allows a guest to spin when allowGuestParticipation is true", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], { allowGuestParticipation: true }),
      entrySnap: makeEntrySnap({}, true),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", guestIpHash: "hash-1" }, ctx);
    expect(result.spinPrizeId).toBe("prize-1");
    expect(result.reason).toBeUndefined();
  });
});

describe("runAssignSpinPrize — spin window", () => {
  it("returns outside_spin_window before the window opens", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], {
        spinWindowStart: new Date("2026-09-01T00:00:00Z"),
      }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("outside_spin_window");
  });

  it("returns outside_spin_window after the window closes", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], {
        spinWindowEnd: new Date("2026-08-01T00:00:00Z"),
      }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("outside_spin_window");
  });

  it("allows the spin inside the window", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], {
        spinWindowStart: new Date("2026-08-01T00:00:00Z"),
        spinWindowEnd: new Date("2026-09-01T00:00:00Z"),
      }),
      entrySnap: makeEntrySnap({}, true),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeId).toBe("prize-1");
  });
});

describe("runAssignSpinPrize — no prizes configured", () => {
  it("returns no_prizes_configured when spinPrizes is empty", async () => {
    const ctx = makeCtx({ eventSnap: makeEvent([]) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("no_prizes_configured");
  });

  it("returns no_prizes_configured when all weights are 0", async () => {
    const ctx = makeCtx({ eventSnap: makeEvent([{ id: "p1", label: "T1", weight: 0 }]) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.reason).toBe("no_prizes_configured");
  });
});

describe("runAssignSpinPrize — spinMaxPerUser enforcement", () => {
  it("returns alreadyUsed=true once the identity's spinCount reaches the default max (1)", async () => {
    const ctx = makeCtx({
      entrySnap: makeEntrySnap({ spinUsed: true, spinCount: 1, spinPrizeId: "prize-1" }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.alreadyUsed).toBe(true);
    expect(result.spinPrizeId).toBe("prize-1");
  });

  it("allows a second spin when spinMaxPerUser=2 and only 1 spin has been used", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], { spinMaxPerUser: 2 }),
      entrySnap: makeEntrySnap({ spinUsed: true, spinCount: 1, spinPrizeId: "prize-1" }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.alreadyUsed).toBeUndefined();
    expect(result.spinPrizeId).toBe("prize-1");
  });

  it("blocks a third spin when spinMaxPerUser=2 and 2 spins already used", async () => {
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], { spinMaxPerUser: 2 }),
      entrySnap: makeEntrySnap({ spinUsed: true, spinCount: 2, spinPrizeId: "prize-1" }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.alreadyUsed).toBe(true);
  });

  it("falls back to the boolean spinUsed flag for legacy entries with no spinCount", async () => {
    const ctx = makeCtx({
      entrySnap: makeEntrySnap({ spinUsed: true, spinPrizeId: "prize-1" }),
    });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.alreadyUsed).toBe(true);
  });
});

describe("runAssignSpinPrize — prize selection", () => {
  it("selects first prize when roll < weight of first prize", async () => {
    mockRandomInt.mockReturnValue(0);
    const prizes = [
      { id: "prize-1", label: "Switch", weight: 5 },
      { id: "prize-2", label: "Shirt", weight: 5 },
    ];
    const ctx = makeCtx({ eventSnap: makeEvent(prizes), entrySnap: makeEntrySnap({}, true) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeId).toBe("prize-1");
  });

  it("selects second prize when roll >= first prize weight", async () => {
    mockRandomInt.mockReturnValue(5);
    const prizes = [
      { id: "prize-1", label: "Switch", weight: 5 },
      { id: "prize-2", label: "Shirt", weight: 5 },
    ];
    const ctx = makeCtx({ eventSnap: makeEvent(prizes), entrySnap: makeEntrySnap({}, true) });
    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeId).toBe("prize-2");
  });

  it("updates the existing entry with spinUsed=true, an incremented spinCount, and spinPrizeId", async () => {
    mockRandomInt.mockReturnValue(0);
    const ctx = makeCtx({ entrySnap: makeEntrySnap({ spinUsed: false, spinCount: 0 }) }) as JobContext & {
      txUpdate: ReturnType<typeof vi.fn>;
    };
    await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(ctx.txUpdate).toHaveBeenCalledTimes(1);
    const [, patch] = ctx.txUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(patch.spinUsed).toBe(true);
    expect(patch.spinCount).toBe(1);
    expect(patch.spinPrizeId).toBe("prize-1");
  });

  it("creates a brand-new entry doc on a guest's first spin", async () => {
    mockRandomInt.mockReturnValue(0);
    const ctx = makeCtx({
      eventSnap: makeEvent([{ id: "prize-1", label: "Switch", weight: 1 }], { allowGuestParticipation: true }),
      entrySnap: makeEntrySnap({}, true),
    }) as JobContext & { txSet: ReturnType<typeof vi.fn> };
    await runAssignSpinPrize({ eventId: "event-1", guestIpHash: "hash-1" }, ctx);
    expect(ctx.txSet).toHaveBeenCalledTimes(1);
    const [, doc] = ctx.txSet.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(doc.guestIpHash).toBe("hash-1");
    expect(doc.userId).toBeUndefined();
    expect(doc.spinCount).toBe(1);
  });

  it("attaches couponCode when prize has couponId and coupon exists", async () => {
    mockRandomInt.mockReturnValue(0);
    const prizes = [{ id: "prize-1", label: "Coupon Prize", weight: 1, couponId: "coupon-abc" }];
    const couponSnap = { exists: true, data: () => ({ code: "SUMMER20" }) };

    const ctx = makeCtx({ eventSnap: makeEvent(prizes), entrySnap: makeEntrySnap({}, true), couponSnap });

    const result = await runAssignSpinPrize({ eventId: "event-1", userId: "user-1" }, ctx);
    expect(result.spinPrizeCouponCode).toBe("SUMMER20");
  });
});
