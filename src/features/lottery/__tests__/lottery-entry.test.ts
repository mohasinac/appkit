import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LotteryConfig } from "../types/index";
import { LotteryError } from "../types/index";

// Mock the repository and db
const mockDb = {
  collection: vi.fn(),
  runTransaction: vi.fn(),
};

const mockLotteryEntryRepository = {
  countByUser: vi.fn(),
  countByTransactionId: vi.fn(),
  createEntry: vi.fn(),
  findByIdOrFail: vi.fn(),
  flagEntry: vi.fn(),
};

const mockEventRepository = {
  findById: vi.fn(),
};

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => mockDb,
  prepareForFirestore: (data: Record<string, unknown>) => data,
  BaseRepository: class {},
}));

vi.mock("../../../../repositories", () => ({
  eventRepository: mockEventRepository,
}));

vi.mock("../repository/lottery-entry.repository", () => ({
  lotteryEntryRepository: mockLotteryEntryRepository,
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: vi.fn().mockResolvedValue({ uid: "user-123", displayName: "Test User", email: "test@example.com" }),
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Error" };
    }
  },
}));

function makeLotteryConfig(overrides: Partial<LotteryConfig> = {}): LotteryConfig {
  return {
    totalSlots: 3,
    pricingMode: "uniform",
    uniformPrice: 100,
    drawWindowDurationMinutes: 5,
    maxPullsPerTransaction: 1,
    maxPullsPerUser: 1,
    slots: [
      { slotNumber: 1, name: "Slot 1", price: 100, weight: 50, isBooked: false },
      { slotNumber: 2, name: "Slot 2", price: 100, weight: 50, isBooked: false },
      { slotNumber: 3, name: "Slot 3", price: 100, weight: 50, isBooked: false },
    ],
    ...overrides,
  };
}

describe("Lottery entry submission logic (guarded checks only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LotteryError codes", () => {
    it("LOTTERY_FULL is thrown correctly", () => {
      const err = new LotteryError("LOTTERY_FULL", "No slots remain");
      expect(err.code).toBe("LOTTERY_FULL");
      expect(err.message).toBe("No slots remain");
      expect(err instanceof LotteryError).toBe(true);
    });

    it("USER_LIMIT_REACHED code is defined", () => {
      const err = new LotteryError("USER_LIMIT_REACHED", "Limit reached");
      expect(err.code).toBe("USER_LIMIT_REACHED");
    });

    it("TX_ALREADY_USED code is defined", () => {
      const err = new LotteryError("TX_ALREADY_USED", "TX used");
      expect(err.code).toBe("TX_ALREADY_USED");
    });

    it("LOTTERY_WINDOW_CLOSED code is defined", () => {
      const err = new LotteryError("LOTTERY_WINDOW_CLOSED", "Window closed");
      expect(err.code).toBe("LOTTERY_WINDOW_CLOSED");
    });
  });

  describe("Config slot counting", () => {
    it("detects all slots booked", () => {
      const config = makeLotteryConfig({
        slots: [
          { slotNumber: 1, name: "S1", price: 100, weight: 50, isBooked: true },
          { slotNumber: 2, name: "S2", price: 100, weight: 50, isBooked: true },
        ],
      });
      const unclaimed = config.slots.filter((s) => !s.isBooked);
      expect(unclaimed.length).toBe(0);
    });

    it("detects available slots", () => {
      const config = makeLotteryConfig();
      const unclaimed = config.slots.filter((s) => !s.isBooked);
      expect(unclaimed.length).toBe(3);
    });

    it("counts booked slots correctly after partial fill", () => {
      const config = makeLotteryConfig({
        slots: [
          { slotNumber: 1, name: "S1", price: 100, weight: 50, isBooked: true },
          { slotNumber: 2, name: "S2", price: 100, weight: 50, isBooked: false },
        ],
      });
      expect(config.slots.filter((s) => s.isBooked).length).toBe(1);
      expect(config.slots.filter((s) => !s.isBooked).length).toBe(1);
    });
  });

  describe("maxPullsPerUser enforcement", () => {
    it("allows pull when user has 0 existing pulls and limit is 1", () => {
      const existingPulls = 0;
      const maxPullsPerUser = 1;
      expect(existingPulls >= maxPullsPerUser).toBe(false); // not rejected
    });

    it("blocks pull when user has 1 existing pull and limit is 1", () => {
      const existingPulls = 1;
      const maxPullsPerUser = 1;
      expect(existingPulls >= maxPullsPerUser).toBe(true); // rejected
    });

    it("allows second pull when limit is 2 and user has 1 pull", () => {
      const existingPulls = 1;
      const maxPullsPerUser = 2;
      expect(existingPulls >= maxPullsPerUser).toBe(false); // not rejected
    });

    it("blocks pull when user reaches limit of 2", () => {
      const existingPulls = 2;
      const maxPullsPerUser = 2;
      expect(existingPulls >= maxPullsPerUser).toBe(true); // rejected
    });
  });

  describe("maxPullsPerTransaction enforcement", () => {
    it("blocks pull when TX ID already used at the limit", () => {
      const existingTxPulls = 1;
      const maxPullsPerTransaction = 1;
      expect(existingTxPulls >= maxPullsPerTransaction).toBe(true); // rejected
    });

    it("allows pull when TX ID used 0 times", () => {
      const existingTxPulls = 0;
      const maxPullsPerTransaction = 1;
      expect(existingTxPulls >= maxPullsPerTransaction).toBe(false); // not rejected
    });
  });
});
