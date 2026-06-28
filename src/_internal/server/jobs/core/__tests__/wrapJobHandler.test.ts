import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRecord, mockMapToHttpError } = vi.hoisted(() => ({
  mockRecord: vi.fn().mockResolvedValue(undefined),
  mockMapToHttpError: vi.fn().mockReturnValue({ code: 500, message: "Internal error" }),
}));

vi.mock("../../../../../features/server-errors/repository/server-errors.repository", () => ({
  serverErrorsRepository: vi.fn(() => ({ record: mockRecord })),
}));

vi.mock("../../../../../errors/error-mapping", () => ({
  mapToHttpError: mockMapToHttpError,
}));

import {
  wrapScheduleHandler,
  wrapTriggerHandler,
  wrapCallableHandler,
  wrapJobHandler,
} from "../wrapJobHandler";

function makeCtx() {
  return {
    db: {},
    now: new Date("2026-01-01"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as Parameters<Parameters<typeof wrapScheduleHandler>[1]>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRecord.mockResolvedValue(undefined);
  mockMapToHttpError.mockReturnValue({ code: 500, message: "Internal error" });
});

// ── wrapScheduleHandler ──────────────────────────────────────────────────────

describe("wrapScheduleHandler", () => {
  it("returns handler result when handler succeeds", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = wrapScheduleHandler("my-job", handler);
    await expect(wrapped(makeCtx())).resolves.toBeUndefined();
  });

  it("persists error to serverErrors when handler throws", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("job failed"));
    const wrapped = wrapScheduleHandler("my-job", handler);
    try { await wrapped(makeCtx()); } catch { /* expected */ }
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ source: "function", route: "my-job" }),
    );
  });

  it("re-throws the original error after persisting", async () => {
    const err = new Error("job failed");
    const handler = vi.fn().mockRejectedValue(err);
    const wrapped = wrapScheduleHandler("my-job", handler);
    await expect(wrapped(makeCtx())).rejects.toThrow("job failed");
  });

  it("persist failure does NOT prevent re-throw", async () => {
    const err = new Error("job failed");
    mockRecord.mockRejectedValue(new Error("DB write failed"));
    const handler = vi.fn().mockRejectedValue(err);
    const wrapped = wrapScheduleHandler("my-job", handler);
    await expect(wrapped(makeCtx())).rejects.toThrow("job failed");
  });

  it("calls mapToHttpError to normalise the error", async () => {
    const err = new Error("Something broke");
    const handler = vi.fn().mockRejectedValue(err);
    const wrapped = wrapScheduleHandler("my-job", handler);
    try { await wrapped(makeCtx()); } catch { /* expected */ }
    expect(mockMapToHttpError).toHaveBeenCalledWith(err);
  });

  it("requestId includes handler name", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("oops"));
    const wrapped = wrapScheduleHandler("audit-run", handler);
    try { await wrapped(makeCtx()); } catch { /* expected */ }
    const call = mockRecord.mock.calls[0][0] as { requestId: string };
    expect(call.requestId).toMatch(/audit-run/);
  });
});

// ── wrapTriggerHandler ───────────────────────────────────────────────────────

describe("wrapTriggerHandler", () => {
  const mockEvent = { path: "test/doc1", params: {}, before: null, after: {} };

  it("returns handler result when handler succeeds", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = wrapTriggerHandler("trigger-fn", handler);
    await expect(wrapped(mockEvent, makeCtx())).resolves.toBeUndefined();
  });

  it("persists error and re-throws when handler throws", async () => {
    const err = new Error("trigger failed");
    const handler = vi.fn().mockRejectedValue(err);
    const wrapped = wrapTriggerHandler("trigger-fn", handler);
    await expect(wrapped(mockEvent, makeCtx())).rejects.toThrow("trigger failed");
    expect(mockRecord).toHaveBeenCalled();
  });
});

// ── wrapCallableHandler ──────────────────────────────────────────────────────

describe("wrapCallableHandler", () => {
  it("returns handler result when handler succeeds", async () => {
    const handler = vi.fn().mockResolvedValue({ result: "ok" });
    const wrapped = wrapCallableHandler("callable-fn", handler);
    await expect(wrapped({}, makeCtx())).resolves.toEqual({ result: "ok" });
  });

  it("persists error and re-throws when handler throws", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("callable failed"));
    const wrapped = wrapCallableHandler("callable-fn", handler);
    await expect(wrapped({}, makeCtx())).rejects.toThrow("callable failed");
    expect(mockRecord).toHaveBeenCalled();
  });
});

// ── wrapJobHandler ───────────────────────────────────────────────────────────

describe("wrapJobHandler", () => {
  it("returns handler result for a generic handler", async () => {
    const handler = vi.fn().mockResolvedValue(42);
    const wrapped = wrapJobHandler("generic-fn", handler);
    await expect(wrapped()).resolves.toBe(42);
  });

  it("persists error with handler name and re-throws", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("generic failed"));
    const wrapped = wrapJobHandler("generic-fn", handler);
    await expect(wrapped()).rejects.toThrow("generic failed");
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ route: "generic-fn", source: "function" }),
    );
  });

  it("extracts JobContext from last arg if it has .now", async () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const handler = vi.fn().mockRejectedValue(new Error("err"));
    const wrapped = wrapJobHandler("fn-with-ctx", handler);
    try { await wrapped({ now }); } catch { /* expected */ }
    const call = mockRecord.mock.calls[0][0] as { occurredAt: number };
    expect(call.occurredAt).toBe(now.getTime());
  });
});
