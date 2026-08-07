import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetActiveEmiOrders, mockOrderUpdate, mockSendNotification } = vi.hoisted(() => ({
  mockGetActiveEmiOrders: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockSendNotification: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  orderRepository: { getActiveEmiOrders: mockGetActiveEmiOrders, update: mockOrderUpdate },
}));
vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));
vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { runEmiInstallmentReminder } from "../emiInstallmentReminder";
import type { JobContext } from "../../runtime/types";

const NOW = new Date("2026-06-15T00:00:00Z");

function makeCtx(): JobContext {
  return {
    db: {} as JobContext["db"],
    now: NOW,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: vi.fn().mockReturnValue("true"),
  } as unknown as JobContext;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    ref: { id: "order-1" },
    data: {
      id: "order-1",
      userId: "user-1",
      emiEnabled: true,
      emiComplete: false,
      emiInstallments: [],
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
  mockOrderUpdate.mockResolvedValue(undefined);
});

describe("runEmiInstallmentReminder", () => {
  it("no active EMI orders → no-op", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([]);
    await runEmiInstallmentReminder(makeCtx());
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("installment due within the 3-day window → sends a due-soon reminder, does not flip status", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          { index: 1, dueDate: new Date("2026-06-16"), amount: 5000, status: "pending" },
        ],
      }),
    ]);
    await runEmiInstallmentReminder(makeCtx());

    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "emi_installment_due_soon", priority: "normal" }),
    );
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        emiInstallments: [expect.objectContaining({ index: 1, status: "pending", reminderSentAt: NOW })],
      }),
    );
  });

  it("installment past due → flips to overdue and sends a high-priority notification", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          { index: 1, dueDate: new Date("2026-06-01"), amount: 5000, status: "pending" },
        ],
      }),
    ]);
    await runEmiInstallmentReminder(makeCtx());

    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "emi_installment_overdue", priority: "high" }),
    );
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        emiInstallments: [expect.objectContaining({ index: 1, status: "overdue", reminderSentAt: NOW })],
      }),
    );
  });

  it("installment far in the future (outside 3-day window) → skipped, no notification", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          { index: 1, dueDate: new Date("2026-07-15"), amount: 5000, status: "pending" },
        ],
      }),
    ]);
    await runEmiInstallmentReminder(makeCtx());

    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("installment already reminded (reminderSentAt set) → skipped even if still due-soon", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          {
            index: 1,
            dueDate: new Date("2026-06-16"),
            amount: 5000,
            status: "pending",
            reminderSentAt: new Date("2026-06-14"),
          },
        ],
      }),
    ]);
    await runEmiInstallmentReminder(makeCtx());

    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("already-paid installment → skipped regardless of due date", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          { index: 1, dueDate: new Date("2026-06-01"), amount: 5000, status: "paid", paidAt: new Date("2026-06-01") },
        ],
      }),
    ]);
    await runEmiInstallmentReminder(makeCtx());

    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("mixed installments: only the due one triggers a notification, both are written back", async () => {
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          { index: 1, dueDate: new Date("2026-06-16"), amount: 5000, status: "pending" },
          { index: 2, dueDate: new Date("2026-09-16"), amount: 5000, status: "pending" },
        ],
      }),
    ]);
    await runEmiInstallmentReminder(makeCtx());

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockOrderUpdate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        emiInstallments: [
          expect.objectContaining({ index: 1, reminderSentAt: NOW }),
          expect.objectContaining({ index: 2, status: "pending" }),
        ],
      }),
    );
  });

  it("notification failure is non-fatal — logs a warning and skips the order update for that installment", async () => {
    mockSendNotification.mockRejectedValueOnce(new Error("notify failed"));
    mockGetActiveEmiOrders.mockResolvedValue([
      makeOrder({
        emiInstallments: [
          { index: 1, dueDate: new Date("2026-06-16"), amount: 5000, status: "pending" },
        ],
      }),
    ]);
    const ctx = makeCtx();
    await runEmiInstallmentReminder(ctx);

    expect(ctx.logger.warn).toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });
});
