import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindExpiredActive,
  mockExpireMany,
  mockSendNotification,
} = vi.hoisted(() => ({
  mockFindExpiredActive: vi.fn(),
  mockExpireMany: vi.fn(),
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../repositories", () => ({
  offerRepository: {
    findExpiredActive: mockFindExpiredActive,
    expireMany: mockExpireMany,
  },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { runOfferExpiry } from "../offerExpiry";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date("2026-01-15T12:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeOffer(overrides: Partial<{ id: string; buyerUid: string; productTitle: string }> = {}) {
  return {
    id: overrides.id ?? "offer-1",
    buyerUid: overrides.buyerUid ?? "buyer-uid",
    productTitle: overrides.productTitle ?? "Charizard PSA 9",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindExpiredActive.mockResolvedValue([]);
  mockExpireMany.mockResolvedValue(undefined);
});

describe("runOfferExpiry — no expired offers", () => {
  it("returns early without calling sendNotification or expireMany", async () => {
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockExpireMany).not.toHaveBeenCalled();
  });

  it("logs that no expired offers were found", async () => {
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no expired/i));
  });
});

describe("runOfferExpiry — expired offers found", () => {
  it("calls sendNotification for each expired offer", async () => {
    const offers = [makeOffer({ id: "offer-1" }), makeOffer({ id: "offer-2" })];
    mockFindExpiredActive.mockResolvedValue(offers);
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  it("notifies the correct buyer for each offer", async () => {
    mockFindExpiredActive.mockResolvedValue([makeOffer({ buyerUid: "buyer-ravi" })]);
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "buyer-ravi", type: "offer_expired" }),
    );
  });

  it("includes product title in notification message", async () => {
    mockFindExpiredActive.mockResolvedValue([makeOffer({ productTitle: "Pokemon Pikachu" })]);
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    const call = mockSendNotification.mock.calls[0][0];
    expect(call.message).toMatch(/Pokemon Pikachu/);
  });

  it("calls expireMany with all offer IDs after notifications", async () => {
    mockFindExpiredActive.mockResolvedValue([
      makeOffer({ id: "offer-1" }),
      makeOffer({ id: "offer-2" }),
    ]);
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    expect(mockExpireMany).toHaveBeenCalledWith(["offer-1", "offer-2"]);
  });
});

describe("runOfferExpiry — notification failure is non-fatal", () => {
  it("still expires offers even if notification fails for one", async () => {
    mockFindExpiredActive.mockResolvedValue([makeOffer({ id: "offer-1" })]);
    mockSendNotification.mockRejectedValueOnce(new Error("Notification service down"));
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    // expireMany should still be called
    expect(mockExpireMany).toHaveBeenCalledWith(["offer-1"]);
  });

  it("logs a warning when notification fails", async () => {
    mockFindExpiredActive.mockResolvedValue([makeOffer()]);
    mockSendNotification.mockRejectedValueOnce(new Error("fail"));
    const ctx = makeCtx();
    await runOfferExpiry(ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});

describe("runOfferExpiry — findExpiredActive failure re-throws", () => {
  it("throws when repository query fails", async () => {
    mockFindExpiredActive.mockRejectedValue(new Error("Firestore error"));
    const ctx = makeCtx();
    await expect(runOfferExpiry(ctx)).rejects.toThrow("Firestore error");
  });
});
