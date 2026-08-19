import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindByStatus, mockSetDashboardRollup } = vi.hoisted(() => ({
  mockFindByStatus: vi.fn(),
  mockSetDashboardRollup: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  orderRepository: { findByStatus: mockFindByStatus },
  analyticsRollupRepository: { setDashboardRollup: mockSetDashboardRollup },
}));

import { runRevenueRollup } from "../revenueRollup";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSetDashboardRollup.mockResolvedValue(undefined);
});

describe("runRevenueRollup", () => {
  it("fetches delivered orders via findByStatus('delivered')", async () => {
    mockFindByStatus.mockResolvedValue([]);
    await runRevenueRollup(makeCtx());
    expect(mockFindByStatus).toHaveBeenCalledWith("delivered");
  });

  it("sums totalPrice across all delivered orders", async () => {
    mockFindByStatus.mockResolvedValue([{ totalPrice: 100000 }, { totalPrice: 250000 }, { totalPrice: 50000 }]);
    await runRevenueRollup(makeCtx());
    expect(mockSetDashboardRollup).toHaveBeenCalledWith({ totalRevenue: 400000, deliveredOrderCount: 3 });
  });

  it("order missing totalPrice → treated as 0 in the sum", async () => {
    mockFindByStatus.mockResolvedValue([{ totalPrice: 50000 }, {}]);
    await runRevenueRollup(makeCtx());
    expect(mockSetDashboardRollup).toHaveBeenCalledWith({ totalRevenue: 50000, deliveredOrderCount: 2 });
  });

  it("no delivered orders → totalRevenue 0", async () => {
    mockFindByStatus.mockResolvedValue([]);
    await runRevenueRollup(makeCtx());
    expect(mockSetDashboardRollup).toHaveBeenCalledWith({ totalRevenue: 0, deliveredOrderCount: 0 });
  });

  it("findByStatus failure → falls back to empty list, still writes rollup", async () => {
    mockFindByStatus.mockRejectedValue(new Error("DB error"));
    await runRevenueRollup(makeCtx());
    expect(mockSetDashboardRollup).toHaveBeenCalledWith({ totalRevenue: 0, deliveredOrderCount: 0 });
  });
});
