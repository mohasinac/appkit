/**
 * Regression test for case-insensitive filter operators (`@=*`, `_=*`, `==*`,
 * `!=*`, `_-=*`).
 *
 * The Firebase adapter throws on any of them, and the processor runs with
 * `throwExceptions: false` — so the throw was converted into SILENCE. What came
 * back was not a partial result but, in the common case, the bare collection.
 * Measured against the stock pipeline before the fix:
 *
 *   filters="status==published,title==foo"      → where, where, orderBy   ✅
 *   filters="title@=*dranzer,status==published" → NOTHING APPLIED
 *   filters="status==published,title@=*dranzer" → where(status) only, sort lost
 *
 * The sort is discarded in BOTH orderings, because sorting happens after
 * filtering in the pipeline and the catch returns the query as of the throw.
 * In production that meant typing a search term on /products returned the whole
 * catalogue with every selected facet and the chosen sort silently dropped —
 * HTTP 200, plausible-looking rows, nothing in any log.
 *
 * `ignoreUnsupported: true` is NOT a fix: it drops the clause just as quietly.
 * So the only honest options were "throw" or "keep lying", and a caller asking
 * for an operator the backend cannot express is a 400.
 *
 * These tests fail against the pre-fix code: the first two would resolve rather
 * than reject, and the third would record zero `where` calls.
 */
import { describe, it, expect } from "vitest";
import { applySieveToFirestore } from "../sieve";
import { ValidationError } from "../../../errors/validation-error";
import type { CollectionReference } from "firebase-admin/firestore";

interface RecordedWhere {
  field: string;
  op: string;
  value: unknown;
}

function makeFakeQuery() {
  const wheres: RecordedWhere[] = [];
  const orderBys: string[] = [];
  const q: Record<string, unknown> = {};
  Object.assign(q, {
    where(field: string, op: string, value: unknown) {
      wheres.push({ field, op, value });
      return q;
    },
    orderBy(field: string, dir: string) {
      orderBys.push(`${field} ${dir}`);
      return q;
    },
    limit: () => q,
    offset: () => q,
    startAfter: () => q,
    select: () => q,
    count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
    get: async () => ({ docs: [] }),
  });
  return { q: q as unknown as CollectionReference, wheres, orderBys };
}

const FIELDS = {
  status: { canFilter: true, canSort: true },
  title: { canFilter: true, canSort: true },
  createdAt: { canFilter: true, canSort: true },
};

function run(filters: string, sorts = "-createdAt") {
  const { q, wheres, orderBys } = makeFakeQuery();
  return {
    promise: applySieveToFirestore({
      baseQuery: q,
      model: { filters, sorts, page: "1", pageSize: "50" },
      fields: FIELDS,
    }),
    wheres,
    orderBys,
  };
}

describe("applySieveToFirestore — case-insensitive operators", () => {
  it("rejects a case-insensitive clause instead of silently returning everything", async () => {
    const { promise } = run("title@=*dranzer,status==published");
    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });

  it("names the offending field, so the log says which clause to fix", async () => {
    const { promise } = run("title@=*dranzer,status==published");
    await expect(promise).rejects.toThrow(/title/);
  });

  it("rejects even when the clause is last — the sort is lost either way", async () => {
    const { promise } = run("status==published,title@=*dranzer");
    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });

  it("leaves ordinary filters and sorts untouched", async () => {
    const { promise, wheres, orderBys } = run("status==published,title==foo");
    await promise;

    expect(wheres).toEqual(
      expect.arrayContaining([
        { field: "status", op: "==", value: "published" },
        { field: "title", op: "==", value: "foo" },
      ]),
    );
    // The sort surviving is the half the silent failure destroyed.
    expect(orderBys).toContain("createdAt desc");
  });

  it("still upgrades a same-field OR group — the enhanced adapter is intact", async () => {
    const { promise, wheres } = run("status==published|draft", "");
    await promise;

    const statusClauses = wheres.filter((w) => w.field === "status");
    expect(statusClauses).toHaveLength(1);
    expect(statusClauses[0].op).toBe("in");
    expect(statusClauses[0].value).toEqual(["published", "draft"]);
  });
});
