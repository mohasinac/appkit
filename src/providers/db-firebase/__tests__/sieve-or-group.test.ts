/**
 * Regression test for the same-field OR-group ("pipe") filter.
 *
 * `field==a|b` is how every multi-select facet in the app is expressed — the
 * /products type chips, the condition chips, and anything else built on
 * `sieveFilter(field, SIEVE_OP.EQ, values.join("|"))`.
 *
 * Firestore has no OR-on-one-field operator; the correct translation is
 * `.where(field, "in", [a, b])`. sievejs' stock Firebase adapter instead emits
 * `whereOr`, which the Admin SDK does not implement — and because the processor
 * runs with `throwExceptions: false`, the clause was dropped in silence and the
 * query came back COMPLETELY UNFILTERED. In production that meant ticking two
 * type chips returned the entire catalogue rather than the two types asked for.
 *
 * `createEnhancedFirebaseAdapter` exists precisely to upgrade that group to an
 * `in` query — but it was only wired into `FirebaseSieveRepository.sieveQuery`,
 * while `applySieveToFirestore` (which `BaseRepository.sieveQuery` delegates to,
 * and which is therefore what ProductRepository and most other repositories
 * actually run) constructed a STOCK adapter.
 *
 * These tests assert the translation at the Firestore-call boundary, so they
 * fail if either path regresses back to the stock adapter.
 */
import { describe, it, expect } from "vitest";
import { applySieveToFirestore } from "../sieve";
import type { CollectionReference } from "firebase-admin/firestore";

interface RecordedWhere {
  field: string;
  op: string;
  value: unknown;
}

/**
 * Minimal Firestore query double. Every builder method returns `this` so the
 * chain works, and each `.where()` is recorded for assertion. `whereOr` is
 * deliberately ABSENT — the real Admin SDK does not have it, so if the stock
 * adapter is in play the call throws rather than silently passing.
 */
function makeFakeQuery() {
  const wheres: RecordedWhere[] = [];
  const q: Record<string, unknown> = {};
  Object.assign(q, {
    where(field: string, op: string, value: unknown) {
      wheres.push({ field, op, value });
      return q;
    },
    orderBy: () => q,
    limit: () => q,
    offset: () => q,
    startAfter: () => q,
    select: () => q,
    count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
    get: async () => ({ docs: [] }),
  });
  return { q: q as unknown as CollectionReference, wheres };
}

const FIELDS = {
  status: { canFilter: true, canSort: true },
  listingType: { canFilter: true, canSort: false },
  condition: { canFilter: true, canSort: false },
};

async function run(filters: string) {
  const { q, wheres } = makeFakeQuery();
  await applySieveToFirestore({
    baseQuery: q,
    model: { filters, sorts: "", page: "1", pageSize: "50" },
    fields: FIELDS,
  });
  return wheres;
}

describe("applySieveToFirestore — same-field OR groups", () => {
  it("translates a two-value pipe group into a single Firestore `in` query", async () => {
    const wheres = await run("listingType==art|stickers");

    const listingClauses = wheres.filter((w) => w.field === "listingType");
    expect(listingClauses).toHaveLength(1);
    expect(listingClauses[0].op).toBe("in");
    expect(listingClauses[0].value).toEqual(["art", "stickers"]);
  });

  it("is field-agnostic — `condition` behaves identically", async () => {
    const wheres = await run("condition==new|used");

    const conditionClauses = wheres.filter((w) => w.field === "condition");
    expect(conditionClauses).toHaveLength(1);
    expect(conditionClauses[0].op).toBe("in");
    expect(conditionClauses[0].value).toEqual(["new", "used"]);
  });

  it("still emits a plain equality for a single value", async () => {
    const wheres = await run("listingType==art");

    const listingClauses = wheres.filter((w) => w.field === "listingType");
    expect(listingClauses).toHaveLength(1);
    expect(listingClauses[0].op).toBe("==");
    expect(listingClauses[0].value).toBe("art");
  });

  it("keeps the OR group alongside other AND clauses", async () => {
    const wheres = await run("status==published,listingType==auction|pre-order");

    expect(wheres.find((w) => w.field === "status")).toMatchObject({
      op: "==",
      value: "published",
    });
    expect(wheres.find((w) => w.field === "listingType")).toMatchObject({
      op: "in",
      value: ["auction", "pre-order"],
    });
  });

  it("NEVER drops the clause — an unfiltered query is the production bug", async () => {
    const wheres = await run("listingType==art|stickers");

    // The original defect produced ZERO listingType clauses, so Firestore was
    // asked for every published product regardless of the user's selection.
    expect(wheres.some((w) => w.field === "listingType")).toBe(true);
  });
});
