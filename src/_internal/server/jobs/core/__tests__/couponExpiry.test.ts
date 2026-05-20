import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../repositories", () => ({
  couponsRepository: {
    getExpiredActiveRefs: vi.fn(),
    deactivateInBatch: vi.fn(),
  },
}));

import { runCouponExpiry } from "../couponExpiry";
import { couponsRepository } from "../../../../../repositories";
import type { JobContext } from "../../runtime/types";

function makeBatch() {
  return { commit: vi.fn().mockResolvedValue(undefined) };
}

function makeCtx(batchOverride?: ReturnType<typeof makeBatch>): JobContext {
  const batch = batchOverride ?? makeBatch();
  return {
    job: "coupon-expiry",
    db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn(),
    now: new Date("2026-01-15T12:00:00Z"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCouponExpiry", () => {
  it("returns early and does not commit when no expired coupons", async () => {
    (couponsRepository.getExpiredActiveRefs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ctx = makeCtx();
    await runCouponExpiry(ctx);
    expect(ctx.db.batch).not.toHaveBeenCalled();
  });

  it("calls getExpiredActiveRefs with ctx.now", async () => {
    (couponsRepository.getExpiredActiveRefs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const ctx = makeCtx();
    await runCouponExpiry(ctx);
    expect(couponsRepository.getExpiredActiveRefs).toHaveBeenCalledWith(ctx.now);
  });

  it("deactivates each expired coupon in the batch", async () => {
    const refs = [{ id: "coupon-1" }, { id: "coupon-2" }];
    (couponsRepository.getExpiredActiveRefs as ReturnType<typeof vi.fn>).mockResolvedValue(refs);
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await runCouponExpiry(ctx);
    expect(couponsRepository.deactivateInBatch).toHaveBeenCalledTimes(2);
    expect(couponsRepository.deactivateInBatch).toHaveBeenCalledWith(batch, refs[0]);
    expect(couponsRepository.deactivateInBatch).toHaveBeenCalledWith(batch, refs[1]);
  });

  it("commits the batch when there are expired coupons", async () => {
    const refs = [{ id: "coupon-1" }];
    (couponsRepository.getExpiredActiveRefs as ReturnType<typeof vi.fn>).mockResolvedValue(refs);
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await runCouponExpiry(ctx);
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it("does not deactivate or commit when refs is empty", async () => {
    (couponsRepository.getExpiredActiveRefs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await runCouponExpiry(ctx);
    expect(couponsRepository.deactivateInBatch).not.toHaveBeenCalled();
    expect(batch.commit).not.toHaveBeenCalled();
  });
});
