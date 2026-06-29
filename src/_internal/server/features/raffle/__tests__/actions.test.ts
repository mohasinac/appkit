import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRunTriggerEventRaffle,
  mockRunAssignSpinPrize,
  mockGetAdminDb,
} = vi.hoisted(() => ({
  mockRunTriggerEventRaffle: vi.fn(),
  mockRunAssignSpinPrize: vi.fn(),
  mockGetAdminDb: vi.fn(),
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
}));

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: mockGetAdminDb,
}));

vi.mock("../../jobs/core/triggerEventRaffle", () => ({
  runTriggerEventRaffle: mockRunTriggerEventRaffle,
}));

vi.mock("../../jobs/core/assignSpinPrize", () => ({
  runAssignSpinPrize: mockRunAssignSpinPrize,
}));

import { triggerEventRaffleAction, assignSpinPrizeAction } from "../actions";

function makeDb() {
  return { collection: vi.fn() };
}

function makeRaffleInput(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "event-summer-holo-sale-2026",
    adminUserId: "user-admin-1",
    ...overrides,
  };
}

function makeSpinInput(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "event-spin-wheel-2026",
    entryId: "entry-buyer-001",
    spinPrizeId: "prize-coupon-10off",
    ...overrides,
  };
}

describe("triggerEventRaffleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminDb.mockReturnValue(makeDb());
    mockRunTriggerEventRaffle.mockResolvedValue({
      winner: { userId: "user-buyer-1", entryId: "entry-abc123" },
    });
  });

  it("runner throws (event not found) → { ok: false }", async () => {
    mockRunTriggerEventRaffle.mockRejectedValue(new Error("Event not found"));
    const result = await triggerEventRaffleAction(makeRaffleInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("runner throws (no raffle configured) → { ok: false }", async () => {
    mockRunTriggerEventRaffle.mockRejectedValue(new Error("This event has no raffle configured"));
    const result = await triggerEventRaffleAction(makeRaffleInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/no raffle/i);
  });

  it("runner throws (already drawn) → { ok: false }", async () => {
    mockRunTriggerEventRaffle.mockRejectedValue(new Error("Raffle already drawn"));
    const result = await triggerEventRaffleAction(makeRaffleInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/already drawn/i);
  });

  it("runner throws (no entries) → { ok: false }", async () => {
    mockRunTriggerEventRaffle.mockRejectedValue(new Error("No eligible entries for raffle"));
    const result = await triggerEventRaffleAction(makeRaffleInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/no entries|no eligible/i);
  });

  it("valid → runTriggerEventRaffle called with input and job context", async () => {
    await triggerEventRaffleAction(makeRaffleInput());
    expect(mockRunTriggerEventRaffle).toHaveBeenCalledWith(
      makeRaffleInput(),
      expect.objectContaining({ job: "admin.triggerEventRaffle", db: expect.any(Object) }),
    );
  });

  it("valid → context.db set from getAdminDb()", async () => {
    const db = makeDb();
    mockGetAdminDb.mockReturnValue(db);
    await triggerEventRaffleAction(makeRaffleInput());
    const ctx = mockRunTriggerEventRaffle.mock.calls[0][1];
    expect(ctx.db).toBe(db);
  });

  it("success → { ok: true, data: { winner } }", async () => {
    const winner = { userId: "user-buyer-1", entryId: "entry-abc123" };
    mockRunTriggerEventRaffle.mockResolvedValue({ winner });
    const result = await triggerEventRaffleAction(makeRaffleInput());
    expect(result.ok).toBe(true);
    expect((result as { data: { winner: unknown } }).data.winner).toEqual(winner);
  });
});

describe("assignSpinPrizeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminDb.mockReturnValue(makeDb());
    mockRunAssignSpinPrize.mockResolvedValue({
      spinPrizeId: "prize-coupon-10off",
      couponCode: "SPIN10",
    });
  });

  it("runner throws (entry already spun) → { ok: false }", async () => {
    mockRunAssignSpinPrize.mockRejectedValue(new Error("Entry has already used their spin"));
    const result = await assignSpinPrizeAction(makeSpinInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/already spun/i);
  });

  it("runner throws (invalid prize) → { ok: false }", async () => {
    mockRunAssignSpinPrize.mockRejectedValue(new Error("Invalid prize ID"));
    const result = await assignSpinPrizeAction(makeSpinInput());
    expect(result.ok).toBe(false);
  });

  it("valid → runAssignSpinPrize called with input and job context", async () => {
    await assignSpinPrizeAction(makeSpinInput());
    expect(mockRunAssignSpinPrize).toHaveBeenCalledWith(
      makeSpinInput(),
      expect.objectContaining({ job: "user.assignSpinPrize" }),
    );
  });

  it("success → { ok: true, data: spin result }", async () => {
    const spinResult = { spinPrizeId: "prize-coupon-10off", couponCode: "SPIN10" };
    mockRunAssignSpinPrize.mockResolvedValue(spinResult);
    const result = await assignSpinPrizeAction(makeSpinInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(spinResult);
  });
});
