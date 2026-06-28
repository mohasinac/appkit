import { describe, it, expect, vi, beforeEach } from "vitest";

// No repository mocks needed — function uses ctx.db directly.

import { runTriggerEventRaffle } from "../triggerEventRaffle";
import type { JobContext } from "../../runtime/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(dbOverrides = {}) {
  return {
    db: buildMockDb(dbOverrides),
    now: new Date("2026-01-01T00:00:00Z"),
    env: vi.fn().mockReturnValue(""),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

/**
 * Builds a mock Firestore db that:
 *  - eventSnap: resolved by the 'events' collection path
 *  - entriesSnap: resolved by the 'eventEntries' collection path
 */
function buildMockDb(overrides: {
  eventExists?: boolean;
  eventData?: object;
  entriesDocs?: Array<{ id: string; data: () => object }>;
  updateFn?: ReturnType<typeof vi.fn>;
} = {}) {
  const {
    eventExists = true,
    eventData = {},
    entriesDocs = [],
    updateFn = vi.fn().mockResolvedValue(undefined),
  } = overrides;

  const mockUpdate = updateFn;

  // Chain for event: db.collection("events").doc(id).get()
  const eventSnap = { exists: eventExists, data: () => eventData };
  const eventDocRef = { get: vi.fn().mockResolvedValue(eventSnap), update: mockUpdate };
  const eventsCollection = { doc: vi.fn().mockReturnValue(eventDocRef) };

  // Chain for entries: db.collection("eventEntries").where(...).where(...).get()
  const entriesSnap = {
    docs: entriesDocs,
    size: entriesDocs.length,
  };
  const entriesQuery = {
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(entriesSnap),
  };
  const entriesCollection = { where: vi.fn().mockReturnValue(entriesQuery) };

  const db = {
    collection: vi.fn((name: string) => {
      if (name === "events") return eventsCollection;
      if (name === "eventEntries") return entriesCollection;
      return eventsCollection;
    }),
    mockUpdate, // expose for assertions
  };
  return db as typeof db & { mockUpdate: typeof mockUpdate };
}

function makeEntry(overrides: {
  id?: string;
  userId?: string;
  displayName?: string;
  points?: number;
  createdAt?: Date | object;
} = {}) {
  const { id = "entry-1", userId = "user-ravi", displayName = "Ravi Kumar", points = 0, createdAt = new Date() } = overrides;
  return {
    id,
    data: () => ({ userId, userDisplayName: displayName, points, createdAt }),
  };
}

const INPUT_BASE = { eventId: "event-summer-raffle" };

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runTriggerEventRaffle — event not found", () => {
  it("returns reason=event_not_found when event does not exist", async () => {
    const ctx = makeCtx({ eventExists: false });
    const result = await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(result.reason).toBe("event_not_found");
    expect(result.raffleEntryCount).toBe(0);
  });

  it("does NOT update eventRef when event not found", async () => {
    const ctx = makeCtx({ eventExists: false });
    await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect((ctx.db as unknown as ReturnType<typeof buildMockDb>).mockUpdate).not.toHaveBeenCalled();
  });
});

describe("runTriggerEventRaffle — already triggered (idempotency)", () => {
  it("returns alreadyTriggered=true when winner already set", async () => {
    const ctx = makeCtx({ eventData: { raffleWinnerUserId: "user-already-won" } });
    const result = await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(result.alreadyTriggered).toBe(true);
    expect(result.raffleWinnerUserId).toBe("user-already-won");
  });

  it("does NOT query entries or update event when already triggered", async () => {
    const ctx = makeCtx({ eventData: { raffleWinnerUserId: "user-already-won" } });
    await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect((ctx.db as unknown as ReturnType<typeof buildMockDb>).mockUpdate).not.toHaveBeenCalled();
  });
});

describe("runTriggerEventRaffle — no eligible entries", () => {
  it("returns reason=no_eligible_entries when no CONFIRMED entries exist", async () => {
    const ctx = makeCtx({ entriesDocs: [] });
    const result = await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(result.reason).toBe("no_eligible_entries");
    expect(result.raffleEntryCount).toBe(0);
  });

  it("does NOT update event when no entries", async () => {
    const ctx = makeCtx({ entriesDocs: [] });
    await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect((ctx.db as unknown as ReturnType<typeof buildMockDb>).mockUpdate).not.toHaveBeenCalled();
  });
});

describe("runTriggerEventRaffle — open_raffle (default)", () => {
  it("all confirmed entries are in the pool", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-1" }),
      makeEntry({ id: "e2", userId: "user-2" }),
      makeEntry({ id: "e3", userId: "user-3" }),
    ];
    const ctx = makeCtx({ eventData: { raffleType: "open_raffle" }, entriesDocs: entries });
    const result = await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(["user-1", "user-2", "user-3"]).toContain(result.raffleWinnerUserId);
  });

  it("winner fields written back to event doc", async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    const entries = [makeEntry({ id: "e1", userId: "user-ravi", displayName: "Ravi" })];
    const ctx = makeCtx({ entriesDocs: entries, updateFn });

    await runTriggerEventRaffle(INPUT_BASE, ctx);

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        raffleWinnerUserId: "user-ravi",
        raffleWinnerDisplayName: "Ravi",
        raffleWinnerEntryId: "e1",
        raffleEntryCount: 1,
      }),
    );
  });

  it("raffleTriggeredAt = ctx.now", async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    const now = new Date("2026-03-15T10:00:00Z");
    const entries = [makeEntry({ id: "e1" })];
    const ctx = makeCtx({ entriesDocs: entries, updateFn });
    ctx.now = now;

    await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ raffleTriggeredAt: now }));
  });

  it("raffleEntryCount = total entries (not pool size)", async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    const entries = [
      makeEntry({ id: "e1", userId: "user-1" }),
      makeEntry({ id: "e2", userId: "user-2" }),
    ];
    const ctx = makeCtx({ entriesDocs: entries, updateFn });

    await runTriggerEventRaffle({ ...INPUT_BASE, raffleType: "open_raffle" }, ctx);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ raffleEntryCount: 2 }));
  });

  it("returns correct winner in result object", async () => {
    const entries = [makeEntry({ id: "e1", userId: "user-only", displayName: "Only User" })];
    const ctx = makeCtx({ entriesDocs: entries });
    const result = await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(result.raffleWinnerUserId).toBe("user-only");
    expect(result.raffleWinnerDisplayName).toBe("Only User");
    expect(result.raffleEntryCount).toBe(1);
  });
});

describe("runTriggerEventRaffle — top_n_scorers", () => {
  it("pool limited to top N by points descending", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-low", points: 10 }),
      makeEntry({ id: "e2", userId: "user-high", points: 100 }),
      makeEntry({ id: "e3", userId: "user-mid", points: 50 }),
    ];
    const ctx = makeCtx({ entriesDocs: entries });
    // topN=1 means only the highest scorer can win
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_scorers", topN: 1 },
      ctx,
    );
    expect(result.raffleWinnerUserId).toBe("user-high");
  });

  it("topN=2: winner is either top-1 or top-2 scorer, NOT bottom scorer", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-bottom", points: 1 }),
      makeEntry({ id: "e2", userId: "user-top", points: 100 }),
      makeEntry({ id: "e3", userId: "user-second", points: 50 }),
    ];
    const ctx = makeCtx({ entriesDocs: entries });
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_scorers", topN: 2 },
      ctx,
    );
    expect(["user-top", "user-second"]).toContain(result.raffleWinnerUserId);
    expect(result.raffleWinnerUserId).not.toBe("user-bottom");
  });

  it("topN=0 → entire pool used (topN disabled)", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-1", points: 10 }),
      makeEntry({ id: "e2", userId: "user-2", points: 20 }),
    ];
    const ctx = makeCtx({ entriesDocs: entries });
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_scorers", topN: 0 },
      ctx,
    );
    expect(["user-1", "user-2"]).toContain(result.raffleWinnerUserId);
  });

  it("reads raffleTopN from event when topN not in input", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-low", points: 5 }),
      makeEntry({ id: "e2", userId: "user-high", points: 999 }),
    ];
    const ctx = makeCtx({
      eventData: { raffleType: "top_n_scorers", raffleTopN: 1 },
      entriesDocs: entries,
    });
    const result = await runTriggerEventRaffle(INPUT_BASE, ctx);
    expect(result.raffleWinnerUserId).toBe("user-high");
  });
});

describe("runTriggerEventRaffle — top_n_participants", () => {
  it("pool limited to first N by createdAt ascending", async () => {
    const t1 = new Date("2026-01-01");
    const t2 = new Date("2026-01-02");
    const t3 = new Date("2026-01-03");
    const entries = [
      makeEntry({ id: "e3", userId: "user-last", createdAt: t3 }),
      makeEntry({ id: "e1", userId: "user-first", createdAt: t1 }),
      makeEntry({ id: "e2", userId: "user-second", createdAt: t2 }),
    ];
    const ctx = makeCtx({ entriesDocs: entries });
    // topN=1 means only the earliest registrant wins
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_participants", topN: 1 },
      ctx,
    );
    expect(result.raffleWinnerUserId).toBe("user-first");
  });

  it("handles Firestore Timestamp-like createdAt objects (via toDate)", async () => {
    const entries = [
      makeEntry({
        id: "e1",
        userId: "user-a",
        createdAt: { toDate: () => new Date("2026-01-01") },
      }),
      makeEntry({
        id: "e2",
        userId: "user-b",
        createdAt: { toDate: () => new Date("2026-01-02") },
      }),
    ];
    const ctx = makeCtx({ entriesDocs: entries });
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_participants", topN: 1 },
      ctx,
    );
    expect(result.raffleWinnerUserId).toBe("user-a");
  });
});

describe("runTriggerEventRaffle — input override precedence", () => {
  it("input.raffleType overrides event.raffleType", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-low", points: 1 }),
      makeEntry({ id: "e2", userId: "user-high", points: 999 }),
    ];
    // Event says open_raffle, but input says top_n_scorers topN=1
    const ctx = makeCtx({
      eventData: { raffleType: "open_raffle" },
      entriesDocs: entries,
    });
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_scorers", topN: 1 },
      ctx,
    );
    expect(result.raffleWinnerUserId).toBe("user-high");
  });

  it("input.topN overrides event.raffleTopN", async () => {
    const entries = [
      makeEntry({ id: "e1", userId: "user-low", points: 5 }),
      makeEntry({ id: "e2", userId: "user-high", points: 100 }),
      makeEntry({ id: "e3", userId: "user-mid", points: 50 }),
    ];
    // Event says topN=3 (all), but input says topN=1 (only highest)
    const ctx = makeCtx({
      eventData: { raffleType: "top_n_scorers", raffleTopN: 3 },
      entriesDocs: entries,
    });
    const result = await runTriggerEventRaffle(
      { ...INPUT_BASE, raffleType: "top_n_scorers", topN: 1 },
      ctx,
    );
    expect(result.raffleWinnerUserId).toBe("user-high");
  });
});
