import { describe, expect, it } from "vitest";
import { wrapAction, isOk, unwrap } from "../action-result";
import { ValidationError } from "../../../../errors/validation-error";
import { NotFoundError } from "../../../../errors/not-found-error";

describe("wrapAction", () => {
  it("returns ok envelope on success", async () => {
    const r = await wrapAction(async () => 42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(42);
  });

  it("returns error envelope on thrown ValidationError → VALIDATION_FAILED", async () => {
    const r = await wrapAction<number>(async () => {
      throw new ValidationError("bad");
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("VALIDATION_FAILED");
      expect(r.error).toBe("bad");
    }
  });

  it("returns error envelope on thrown NotFoundError → NOT_FOUND", async () => {
    const r = await wrapAction(async () => {
      throw new NotFoundError("user-1");
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("returns error envelope on unknown Error → INTERNAL", async () => {
    const r = await wrapAction(async () => {
      throw new Error("oops");
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INTERNAL");
  });

  it("never throws — string throws also produce an envelope", async () => {
    const r = await wrapAction(async () => {
      throw "raw string";
    });
    expect(r.ok).toBe(false);
  });
});

describe("isOk", () => {
  it("narrows ok arm", async () => {
    const r = await wrapAction(async () => "x");
    if (isOk(r)) {
      // type narrowed — `data` accessible
      expect(r.data).toBe("x");
    }
  });
});

describe("unwrap", () => {
  it("returns data on ok", async () => {
    const r = await wrapAction(async () => 7);
    expect(unwrap(r)).toBe(7);
  });

  it("throws on error", async () => {
    const r = await wrapAction<number>(async () => {
      throw new ValidationError("bad");
    });
    expect(() => unwrap(r)).toThrow("bad");
  });
});
